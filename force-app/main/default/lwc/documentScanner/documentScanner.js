import { LightningElement, api, wire } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getRecord, getFieldValue, updateRecord } from "lightning/uiRecordApi";
import IDCard_FIELD from '@salesforce/schema/Lead.ID_Card__c';
import ID_FIELD from "@salesforce/schema/Lead.Id";
const fields = [IDCard_FIELD];
export default class DocumentScanner extends LightningElement {
  @api recordId;
  @wire(getRecord, { recordId: "$recordId", fields })
  lead;
  @api cameraOpened = false;
  @api imgDataURL = "";
  @api cameraOptions = [];
  fetchedURL = "";
  imageID;
  resolution = "1920x1080";
  cameraID = "";
  get buttonLabel() {
    const label = this.cameraOpened ? 'Close Camera' : 'Open Camera';
    return label;
  }
  get IDCardURL() {
    const url = getFieldValue(this.lead.data, IDCard_FIELD);
    if (url) {
      this.getImg(url);
    }
    return url;
  }

  get resolutionOptions() {
    return [
        { label: '640x480', value: '640x480' },
        { label: '1280x720', value: '1280x720' },
        { label: '1920x1080', value: '1920x1080' },
        { label: '3840x2160', value: '3840x2160' },
    ];
  }

  handleResolutionChange(event) {
    this.resolution = event.detail.value;
  }

  async getImg(url){
    //https://localhost:7158/api/document/1717467730853
    if (url != this.fetchedURL) {
      let response = await fetch(url);
      let base64 = await response.text();
      this.imgDataURL = "data:image/jpeg;base64,"+base64;
      this.fetchedURL = url;
    }
  }

  async connectedCallback() {
    await this.requestCameraPermission();
    await this.listCameras();
  }

  async requestCameraPermission() {
    try {
      const constraints = {video: true, audio: false};
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.closeStream(stream);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async listCameras(){
    let options = [];
    let allDevices = await navigator.mediaDevices.enumerateDevices();
    for (let i = 0; i < allDevices.length; i++){
      let device = allDevices[i];
      if (device.kind == 'videoinput'){
        options.push({label: device.label, value: device.deviceId});
      }
    }
    this.cameraOptions = options;
    if (options.length>0){
      this.cameraID = options[0].value;
    }
  }

  handleCameraChange(event) {
    this.cameraID = event.detail.value;
  }

  async toggleCamera(){
    if (this.cameraOpened == false) {
      const width = parseInt(this.resolution.split("x")[0]);
      const height = parseInt(this.resolution.split("x")[1]);
      const videoConstraints = {
        video: {width:width, height:height, deviceId: this.cameraID},
        audio: false
      };
      const cameraStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
      this.template.querySelector("video").srcObject = cameraStream;
      this.cameraOpened = true;
    }else{
      this.closeStream(this.template.querySelector("video").srcObject);
      this.template.querySelector("video").srcObject = null;
      this.cameraOpened = false;
    }
  }

  closeStream(stream){
    if (stream) {
      const tracks = stream.getTracks();
      for (let i=0;i<tracks.length;i++) {
        const track = tracks[i];
        track.stop();  // stop the opened tracks
      }
    }
  }

  async captureAndUpload(){
    console.log("capture");
    let url = "https://localhost:7158/api/document/detectAndCrop";
    console.log(url);
    let dataURL = this.capture();
    let base64 = dataURL.substring(dataURL.indexOf(",")+1,dataURL.length);
    console.log(base64);
    let data = {Base64:base64};
    console.log(data);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    let json = await response.json();
    console.log(json);
    this.imageID = json.id;
    if (json.success == true) {
      let url = "https://localhost:7158/api/document/cropped/"+this.imageID
      let response = await fetch(url);
      let base64 = await response.text();
      this.imgDataURL = "data:image/jpeg;base64,"+base64;
      this.updateURL(url);
    } else {
      alert("Failed to get the cropped Image.");
    }
  }

  capture(){
    const video = this.template.querySelector("video");
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video,0,0);
    return canvas.toDataURL("image/jpeg",100);
  }

  updateURL(url){
    const fields = {};
    fields[ID_FIELD.fieldApiName] = this.recordId;
    fields[IDCard_FIELD.fieldApiName] = url;
    const recordInput = { fields:fields };
    console.log(recordInput);
    updateRecord(recordInput)
      .then(() => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Record updated",
            variant: "success",
          }),
        );
      })
      .catch((error) => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error updating record",
            message: error.body.message,
            variant: "error",
          }),
        );
      });
  }
}