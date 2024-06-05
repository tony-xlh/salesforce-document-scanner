import { LightningElement, api, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import Lead_OBJECT from '@salesforce/schema/Lead';
import IDCard_FIELD from '@salesforce/schema/Lead.ID_Card__c';
const fields = [IDCard_FIELD];
export default class DocumentScanner extends LightningElement {
  @api recordId;
  @wire(getRecord, { recordId: "$recordId", fields })
  lead;

  get IDCardURL() {
    return getFieldValue(this.lead.data, IDCard_FIELD);
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
  
  async openCamera(){
    const videoConstraints = {
      video: true,
      audio: false
    };
    const cameraStream = await navigator.mediaDevices.getUserMedia(videoConstraints);
    this.template.querySelector("video").srcObject = cameraStream;
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

  capture(){
    console.log("capture");
  }

  upload(){
    console.log("upload");
  }
}