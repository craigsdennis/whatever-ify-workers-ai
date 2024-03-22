import { Ai } from "@cloudflare/ai";
import { Context, Hono } from "hono";
import { streamText } from "hono/streaming";
import { stripIndents } from "common-tags";
import { EventSourceParserStream } from "eventsource-parser/stream";

import index_html from "../public/index.html?raw";

type Bindings = {
  AI: Ai;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.html(index_html);
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
  Describe the person in this photo in great enough detail to provide a Lego artist the ability to recreate them.  

  Ensure you convey the person's distinctive features, their current expression, and overall essence.
  
  Include specifics about their face, hairstyle, clothing, and demeanor.

  Do not describe anything else in the photo except the person. 
  
  Do not describe where they are located or anything in the background.
    
  Provide a detail rich explanation of the person.
  `;
  const response = await ai.run("@cf/unum/uform-gen2-qwen-500m", {
    prompt,
    image: [...new Uint8Array(await photo.arrayBuffer())],
  });
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
  while (!hasValidResponse && retryCount < 5) {
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
    } catch(err) {
      console.error(err);
      retryCount++;
      if (retryCount >= 5) {
        throw err;
      } else {
        console.log(`Retry #${retryCount}...`);
      }
    }
  }
  if (eventSourceStream === undefined) {
    throw new Error(`Problem with model.`)
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
  const ai = new Ai(c.env.AI);
  const systemMessage = stripIndents`
  You are a scene designer for the new Lego Movie.

  The user is going to provide you with a list of hobbies.

  Your task is to design a single fun scene where all of the hobbies could take place.

  Include your lighting ideas and still shot framing.

  Limit your response to 4 sentences.
  `;
  return promptStream(c, systemMessage, json.hobbies);
});

app.post("/api/creative/character", async (c) => {
  const json = await c.req.json();
  const ai = new Ai(c.env.AI);
  const systemMessage = stripIndents`
  You are a Lego character creator.

  The user is going to provide a description of a person.

  Your job is to extract only information about the person and their features. 
  
  Ignore where the user is located physically, what is in their background, or any other irrelevant information.

  Your final task is to craft a description of a new Lego Character that exaggerates their distinctive features.

  Their hobbies are also included.

  Try to create a rich description that will capture their essence and expression in your description.

  Limit your character to 4 sentences.
  `;
  const userPrompt = stripIndents`
  Physical Description: ${json.description}

  Hobbies: ${json.hobbies}
  `
  return promptStream(c, systemMessage, userPrompt);
});

app.post("/api/prompts/stable-diffusion", async (c) => {
  const json = await c.req.json();
  const ai = new Ai(c.env.AI);
  // Send to Mistral
  // If the word man or boy is in the description, assume that is the muppet. Use "((male muppet:1))" in place of man, and if woman or girl use "((female muppet:1))"

  // Include one of "(muppet color yellow)", "(muppet color green)", "(muppet color blue)", "(muppet color pink), or "muppet color purple" based on their description.
  //     Determine the skin color of the muppet based on what will complement the color the best.

  // Include the skin color of the muppet in the prompt.

  // Do not write prose, but instead capture the important elements of the scene in short blurbs separated by commas.
    
  // Put parenthesis around the most important elements. For instance if the character is described as muscular write "strong, (muscular), smile"
  
  // End the prompt with something like "Capture the essence of this (Muppet:1.1) with an artistic, vibrant, and lifelike representation. (photo-realistic)"

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
    Included below is a Lego Movie Scene description and a Lego Character that you should use to create the Stable Diffusion prompt.

    Make a realistic photo of this new Lego Character in the center of the scene described below.

    Try to encourage the scene to be built with Lego. For instance, if there is a part of the scene that says couch, use "couch made of lego".
    
    Only refer to lego characters, not humans. For instance if description says Man or boy, instead use "male lego character", if it says woman or girl use "female lego character"

    End the prompt with something like "Capture the essence of this in (Lego:1.1) with an artistic, vibrant, and lifelike representation. photo realistic."

    Scene: ${json.scene}
    
    Character: ${json.character}
  `;
  return promptStream(c, systemMessage, userPrompt);
});

app.post("/api/images/muppet", async (c) => {
  const json = await c.req.json();
  console.log("Creating muppet", json);
  const ai = new Ai(c.env.AI);
  // Runs Stable diffusion model
  const response = await ai.run("@cf/bytedance/stable-diffusion-xl-lightning", {
    prompt: json.prompt,
  });
  return c.body(response, 200, {
    "Content-Type": "image/x-png",
  });
});

export default app;
