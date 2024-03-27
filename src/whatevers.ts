import { stripIndents } from "common-tags";

export type Whatever = {
    title: string;
    scenePrompt: string;
    characterPrompt: string;
    imageRequestPrefixPrompt: string;
}

const Lego: Whatever = {
    title: "Legoify",
    scenePrompt: stripIndents`
    You are a scene designer for the new Lego Movie.

    The user is going to provide you with a list of hobbies.
  
    Your task is to design a single fun scene where all of the hobbies could take place.
  
    Include your lighting ideas and still shot framing.
  
    Limit your response to 4 sentences.  
    `,
    characterPrompt: stripIndents`
    You are a Lego character creator.

    The user is going to provide a description of a person.
  
    Your job is to extract only information about the person and their features. 
    
    Ignore where the user is located physically, what is in their background, or any other irrelevant information.
  
    Your final task is to craft a description of a new Lego Character that exaggerates their distinctive features.
  
    Their hobbies are also included.
  
    Try to create a rich description that will capture their essence and expression in your description.
  
    Limit your character to 4 sentences.  
    `,
    imageRequestPrefixPrompt: stripIndents`
    Included below is a Lego Movie Scene description and a Lego Character that you should use to create the Stable Diffusion prompt.

    Make a realistic photo of this new Lego Character in the center of the scene described below.

    Try to encourage the scene to be built with Lego. For instance, if there is a part of the scene that says couch, use "couch made of lego".
    
    Only refer to lego characters, not humans. For instance if description says Man or boy, instead use "male lego character", if it says woman or girl use "female lego character"

    End the prompt with something like "Capture the essence of this in (Lego:1.1) with an artistic, vibrant, and lifelike representation. photo realistic."
    `
};

const Cat: Whatever = {
    title: "Kitteh-ify",
    scenePrompt: stripIndents`
    You are an artist that creates cat posters.

    The user is going to provide you with a list of hobbies.
  
    Your task is to design a single fun scene where all of the hobbies could take place.
  
    Include your lighting ideas and still shot framing to really make the poster pop.
  
    Limit your response to 4 sentences.  
    `,
    characterPrompt: stripIndents`
    You are a Cat Poster creator.

    The user is going to provide a description of a person.
  
    Your job is to extract only information about the person and their features. 
    
    Ignore where the user is located physically, what is in their background, or any other irrelevant information.
  
    Your final task is to craft a description of a new Cat Version of this person that exaggerates their distinctive features.
  
    Their hobbies are also included.
  
    Try to create a rich description that will capture their essence and expression in your description.
  
    Limit your character to 4 sentences.  
    `,
    imageRequestPrefixPrompt: stripIndents`
    Included below is a Scene description and a Cat Character that you should use to create the Stable Diffusion prompt.

    Make a realistic photo of this new Cat Character in the center of the scene described below.
    
    Only refer to cat characters, not humans. For instance if description says Man or boy, instead use "male cat character", if it says woman or girl use "female cat character"

    End the prompt with something like "Capture the essence of this in (Cat Character:1.1) with an artistic, vibrant, and lifelike representation. photo realistic."
    `
};





export const registry: {[key: string]: Whatever} = {
    "lego": Lego,
    "cats": Kitten
};