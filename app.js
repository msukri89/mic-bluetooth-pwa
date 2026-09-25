let audioContext=null;
let stream=null;
let source=null;
let gainNode=null;
let compressor=null;
let analyser=null;
let animationId=null;
let running=false;

const $=id=>document.getElementById(id);
const startBtn=$("startBtn"),stopBtn=$("stopBtn"),statusText=$("statusText"),statusDetail=$("statusDetail"),statusDot=$("statusDot");
const volume=$("volume"),volumeValue=$("volumeValue"),meterBar=$("meterBar"),levelText=$("levelText");
const echo=$("echo"),noise=$("noise"),autoGain=$("autoGain");

volume.addEventListener("input",()=>{volumeValue.textContent=Math.round(volume.value*100)+"%";if(gainNode)gainNode.gain.value=Number(volume.value)});

function setStatus(on,title,detail){
  statusDot.classList.toggle("on",on);
  statusText.textContent=title;
  statusDetail.textContent=detail;
}

async function startMic(){
  if(running)return;
  if(!navigator.mediaDevices?.getUserMedia){
    setStatus(false,"Browser tidak mendukung","Buka dengan Chrome/HTTPS.");
    return;
  }
  try{
    startBtn.disabled=true;
    setStatus(false,"Meminta izin mic…","Izinkan akses microphone.");
    stream=await navigator.mediaDevices.getUserMedia({
      audio:{
        echoCancellation:echo.checked,
        noiseSuppression:noise.checked,
        autoGainControl:autoGain.checked,
        channelCount:1
      },
      video:false
    });

    audioContext=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"});
    await audioContext.resume();

    source=audioContext.createMediaStreamSource(stream);
    gainNode=audioContext.createGain();
    gainNode.gain.value=Number(volume.value);

    compressor=audioContext.createDynamicsCompressor();
    compressor.threshold.value=-18;
    compressor.knee.value=12;
    compressor.ratio.value=3;
    compressor.attack.value=0.003;
    compressor.release.value=0.12;

    analyser=audioContext.createAnalyser();
    analyser.fftSize=256;
    analyser.smoothingTimeConstant=.75;

    source.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audioContext.destination);

    running=true;
    stopBtn.disabled=false;
    setStatus(true,"MIC AKTIF","Bicara dekat mic HP. Audio diarahkan ke output Bluetooth.");
    drawMeter();
  }catch(err){
    console.error(err);
    stopMic();
    const msg=err?.name==="NotAllowedError"?"Izin microphone ditolak.":err?.name==="NotFoundError"?"Microphone tidak ditemukan.":"Gagal mengaktifkan microphone.";
    setStatus(false,"Tidak aktif",msg);
    startBtn.disabled=false;
  }
}

function stopMic(){
  running=false;
  if(animationId)cancelAnimationFrame(animationId);
  animationId=null;
  if(stream)stream.getTracks().forEach(t=>t.stop());
  stream=null;
  if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}
  source=null;gainNode=null;compressor=null;analyser=null;
  meterBar.style.width="0%";levelText.textContent="0%";
  startBtn.disabled=false;stopBtn.disabled=true;
  setStatus(false,"Mic berhenti","Tekan MULAI MIC untuk mencoba lagi.");
}

function drawMeter(){
  if(!running||!analyser)return;
  const data=new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum=0;
  for(const v of data){const n=(v-128)/128;sum+=n*n}
  const rms=Math.sqrt(sum/data.length);
  const pct=Math.min(100,Math.round(rms*220));
  meterBar.style.width=pct+"%";
  levelText.textContent=pct+"%";
  animationId=requestAnimationFrame(drawMeter);
}

startBtn.addEventListener("click",startMic);
stopBtn.addEventListener("click",stopMic);
window.addEventListener("pagehide",stopMic);
