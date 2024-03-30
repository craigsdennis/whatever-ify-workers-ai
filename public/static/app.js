const { createApp } = Vue;

createApp({
  data() {
    return {
      hobbies: "",
      image: null,
      imageDescription: "",
      prompt: "",
      creativeScene: "",
      creativeCharacter: "",
      whatever: window.whatever,
      whateverTitle: window.whateverTitle,
      whateverImage: null,
      isWebCamOn: false,
    };
  },
  methods: {
    toggleWebCam() {
      if (!this.isWebCamOn) {
        this.isWebCamOn = true;
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            document.getElementById("webcam").srcObject = stream;
          })
          .catch((err) => {
            console.error("Error accessing webcam: ", err);
          });
      } else {
        // Stop the webcam stream
        const video = document.getElementById("webcam");
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        video.srcObject = null; // Clear the video source
        this.isWebCamOn = false;
      }
    },
    capturePhoto() {
      const video = this.$refs.webcam;
      const canvas = this.$refs.snapshot;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0);
      this.image = canvas.toDataURL();
      canvas.toBlob((blob) => this.updateDescription(blob));
      this.toggleWebCam();
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleFileUpload(event) {
      const file = event.target.files
        ? event.target.files[0]
        : event.dataTransfer.files[0];
      this.processFile(file);
    },
    handleDragOver(event) {
      // This method is necessary to prevent the default behavior,
      // allowing us to drop files into our drop area.
    },
    handleDrop(event) {
      const file = event.dataTransfer.files[0];
      this.processFile(file);
    },
    processFile(file) {
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxWidth = 600;
            const scaleSize = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
              (blob) => {
                this.image = URL.createObjectURL(blob);
                this.updateDescription(blob);
              },
              file.type,
              1
            );
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please upload an image file.");
      }
    },
    async handleStreamingResponse(url, body, onvalue) {
      let whole = "";
      try {
        const response = await fetch(url, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log("Stream done", url);
            return whole;
          }
          //this.prompt += value;
          onvalue(value);
          whole += value;
        }
      } catch(err) {
        console.error("Uh oh", err);
      }
    },
    async generateCreative() {
      const creatives = await Promise.all([
        this.handleStreamingResponse(
          "/api/creative/scene",
          { hobbies: this.hobbies, whatever: this.whatever },
          (val) => (this.creativeScene += val)
        ),
        this.handleStreamingResponse(
          "/api/creative/character",
          { description: this.imageDescription, hobbies: this.hobbies, whatever: this.whatever },
          (val) => (this.creativeCharacter += val)
        ),
      ]);
      console.log(creatives);
      console.log(this.creativeScene);
      console.log(this.creativeCharacter);
      await this.generateStableDiffusionPrompt(
        this.creativeScene,
        this.creativeCharacter
      );
    },
    async generateStableDiffusionPrompt(scene, character) {
      await this.handleStreamingResponse(
        "/api/prompts/stable-diffusion",
        { scene, character, whatever: this.whatever },
        (val) => (this.prompt += val)
      );
      await this.updateWhateverImage();
    },
    async updateDescription(image) {
      const formData = new FormData();
      formData.append("photo", image);
      const response = await fetch("/api/images/description", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      this.imageDescription = json.result;
      this.generateCreative();
    },
    async fetchWhateverImage(prompt) {
      console.log("Fetching image", prompt);
      const response = await fetch("/api/images/", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          whatever: this.whatever
        }),
      });
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    },
    async updateWhateverImage() {
      const url = await this.fetchWhateverImage(this.prompt);
      console.log(url);
      this.whateverImage = url;
    },
  },
}).mount("#app");
