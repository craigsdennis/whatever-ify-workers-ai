import { Ai } from "@cloudflare/ai";
import { Context, Hono } from "hono";
import { streamText } from "hono/streaming";
import { stripIndents } from "common-tags";
import { EventSourceParserStream } from "eventsource-parser/stream";

import whateverify_html from "../public/whateverify.html?raw";
import { renderer } from './renderer'
import { registry } from "./whatevers";

const RETRY_COUNT = 5;

type Bindings = {
  AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(renderer);


app.get("/", (c) => {
  return c.render(
    <div id="app">
      <h1>Whateverify</h1>
      <ul>
      {Object.keys(registry).map(key => (
        <li className={key + " teaching"} key={key}><a href={"/" + key + "/"}>{registry[key].title}</a></li>
      ))}
      </ul>
    </div>
  );
});

app.get("/:whatever/", async (c) => {
  const whateverParam = c.req.param("whatever");
  const whatever = registry[whateverParam];
  let html = whateverify_html;
  html = html.replace("STATIC_WHATEVER", whateverParam);
  html = html.replace("STATIC_WHATEVER_TITLE", whatever.title);
  return c.html(html);
});

app.post("/api/images/description", async (c) => {
  // Accept photo
  type PhotoBodyData = {
    photo: File;
  };
  const data: PhotoBodyData = await c.req.parseBody();
  const photo = data["photo"];
  const ai = new Ai(c.env.AI);

  const prompt = stripIndents`
  Describe the person in this photo in great enough detail to provide an artist the ability to recreate them.  

  Ensure you convey the person's distinctive features, their current expression, and overall essence.
  
  Include specifics about their face, hairstyle, clothing, and demeanor.

  Do not describe anything else in the photo except the person. 
  
  Do not describe where they are located or anything in the background.
    
  Provide a detail rich explanation of the person.
  `;
  let response;
  let hasValidResponse = false;
  let retryCount = 0;
  while (!hasValidResponse && retryCount <= RETRY_COUNT) {
    try {
      response = await ai.run("@cf/unum/uform-gen2-qwen-500m", {
        prompt,
        image: [...new Uint8Array(await photo.arrayBuffer())],
      });
      hasValidResponse = true;
    } catch (err) {
      console.error(err);
      retryCount++;
      if (retryCount >= RETRY_COUNT) {
        throw err;
      } else {
        console.log(`Retry #${retryCount}...`);
      }
    }
  }
  if (response === undefined) {
    throw new Error(`Problem with model.`);
  }

  return c.json({ result: response.description });
});

async function promptStream(
  c: Context<{ Bindings: Bindings }>,
  systemMessage: string,
  userPrompt: string
) {
  const ai = new Ai(c.env.AI);
  let eventSourceStream;
  let hasValidResponse = false;
  let retryCount = 0;
  while (!hasValidResponse && retryCount <= RETRY_COUNT) {
    try {
      eventSourceStream = (await ai.run(
        "@hf/thebloke/openhermes-2.5-mistral-7b-awq",
        {
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }
      )) as ReadableStream<any>;
      hasValidResponse = true;
    } catch (err) {
      console.error(err);
      retryCount++;
      if (retryCount >= RETRY_COUNT) {
        throw err;
      } else {
        console.log(`Retry #${retryCount}...`);
      }
    }
  }
  if (eventSourceStream === undefined) {
    throw new Error(`Problem with model.`);
  }
  const tokenStream = eventSourceStream
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());
  return streamText(c, async (stream) => {
    for await (const msg of tokenStream) {
      if (msg.data !== "[DONE]") {
        const data = JSON.parse(msg.data);
        stream.write(data.response);
      }
    }
  });
}

app.post("/api/creative/scene", async (c) => {
  const json = await c.req.json();
  const whatever = registry[json.whatever];
  return promptStream(c, whatever.scenePrompt, json.hobbies);
});

app.post("/api/creative/character", async (c) => {
  const json = await c.req.json();
  const whatever = registry[json.whatever];
  const userPrompt = stripIndents`
  Physical Description: ${json.description}

  Hobbies: ${json.hobbies}
  `;
  return promptStream(c, whatever.characterPrompt, userPrompt);
});

app.post("/api/prompts/stable-diffusion", async (c) => {
  const json = await c.req.json();
  const whatever = registry[json.whatever];
  const systemMessage = stripIndents`
    You are a Stable Diffusion Prompt Engineer. 

    The user is going to describe a Scene and a Character.

    Your task is to produce a Stable Diffusion XL Lightning prompt.
    
    The photo should be to capture the essence of the Character front and center in the middle of the Scene.

    Create the scene and describe the character using the best practices of Stable Diffusion prompt engineering.

    Make sure to include a nice summary of both the Character and the Scene, so that it can be rendered as close to the user's request as possible.

    Place parentheses around words that are critical to include. For example "(blue polkadot shirt)"

    Ensure that you create the Character, with name if available, and focus on it in the center of the image.

    Try to match their outfit to their description.

    As is best practice for Stable Diffusion, try to not be verbose, separating the most important parts of your descriptions with commas. 
    
    Do not make it read like a sentence, build a Stable Diffusion XL Lightning prompt. 
        
    Do not use location information from the Character's description, describe them in the center of the scene's description.

    If the user requests specific important information ensure to honor their request.

    Do not include labels like "Scene:" or "Character:" in your prompt. 

    Only return the Stable Diffusion Prompt, no explanations.
    
    Do not include a prefix or suffix for the prompt, just return the prompt.
  `;
  const userPrompt = stripIndents`
    ${whatever.imageRequestPrefixPrompt}  

    Scene: ${json.scene}
    
    Character: ${json.character}
  `;
  return promptStream(c, systemMessage, userPrompt);
});

app.post("/api/images/", async (c) => {
  const json = await c.req.json();
  console.log(`Creating ${json.whatever}`, json);
  const ai = new Ai(c.env.AI);
  // Runs Stable diffusion model
  let response;
  let hasValidResponse = false;
  let retryCount = 0;
  while (!hasValidResponse && retryCount <= RETRY_COUNT) {
    try {
      response = await ai.run("@cf/bytedance/stable-diffusion-xl-lightning", {
        prompt: json.prompt,
      });
      hasValidResponse = true;
    } catch (err) {
      console.error(err);
      retryCount++;
      if (retryCount >= RETRY_COUNT) {
        throw err;
      } else {
        console.log(`Retry #${retryCount}...`);
      }
    }
  }
  if (response === undefined) {
    throw new Error(`Problem with model.`);
  }
  return c.body(response, 200, {
    "Content-Type": "image/x-png",
  });
});

export default app;
