import { LightningElement, api, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import IDCard_FIELD from '@salesforce/schema/Lead.ID_Card__c';
const fields = [IDCard_FIELD];
export default class DocumentScanner extends LightningElement {
  @api recordId;
  @wire(getRecord, { recordId: "$recordId", fields })
  lead;
  @api cameraOpened = false;
  @api imgDataURL = "";
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

  async getImg(url){
    //https://localhost:7158/api/document/1717467730853
    let response = await fetch(url);
    let base64 = await response.text();
    this.imgDataURL = "data:image/jpeg;base64,"+base64;
  }

  async connectedCallback() {
    await this.requestCameraPermission();
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
  
  async toggleCamera(){
    if (this.cameraOpened == false) {
      const videoConstraints = {
        video: true,
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

  captureAndUpload(){
    console.log("capture");
  }
}