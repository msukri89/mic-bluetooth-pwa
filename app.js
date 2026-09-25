let audioContext=null;
let stream=null;
let source=null;
let gainNode=null;
let compressor=null;
let analyser=null;
let animationId=null;
let running=false;
let selectedOutputId=null;

const $=id=>document.getElementById(id);
const startBtn=$("startBtn"),stopBtn=$("stopBtn"),statusText=$("statusText"),statusDetail=$("statusDetail"),statusDot=$("statusDot");
const volume=$("volume"),volumeValue=$("volumeValue"),meterBar=$("meterBar"),levelText=$("levelText");
const echo=$("echo"),noise=$("noise"),autoGain=$("autoGain");
const outputText=$("outputText");

volume.addEventListener("input",()=>{
  volumeValue.textContent=Math.round(volume.value*100)+"%";
  if(gainNode)gainNode.gain.value=Number(volume.value);
});

function setStatus(on,title,detail){
  statusDot.classList.toggle("on",on);
  statusText.textContent=title;
  statusDetail.textContent=detail;
}

function setOutputStatus(text){
  if(outputText)outputText.textContent=text;
}

async function findBluetoothOutput(){
  if(!navigator.mediaDevices?.enumerateDevices)return null;

  try{
    const devices=await navigator.mediaDevices.enumerateDevices();
    const outputs=devices.filter(d=>d.kind==="audiooutput");

    // Prioritaskan nama speaker Bluetooth yang umum, termasuk Soundcore Boom 2 SE.
    const preferred=outputs.find(d=>{
      const label=(d.label||"").toLowerCase();
      return /boom 2 se|soundcore|anker|bluetooth/.test(label);
    });

    return preferred || null;
  }catch(err){
    console.warn("Tidak bisa membaca daftar output audio:",err);
    return null;
  }
}

async function routeAudioToBluetooth(){
  selectedOutputId=null;

  // Chrome modern dapat menyediakan AudioContext.setSinkId().
  if(!audioContext || typeof audioContext.setSinkId!=="function"){
    setOutputStatus("Routing Bluetooth khusus tidak tersedia di browser ini.");
    return false;
  }

  const device=await findBluetoothOutput();
  if(!device){
    setOutputStatus("Boom 2 SE tidak terdeteksi sebagai output browser. Bluetooth tetap harus tersambung.");
    return false;
  }

  try{
    await audioContext.setSinkId(device.deviceId);
    selectedOutputId=device.deviceId;
    setOutputStatus("Output: "+(device.label||"Bluetooth speaker"));
    return true;
  }catch(err){
    console.warn("Gagal memilih output Bluetooth:",err);
    setOutputStatus("Browser menemukan speaker, tetapi gagal mengarahkan audio ke sana.");
    return false;
  }
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

    audioContext=new (window.AudioContext||window.webkitAudioContext)({
      latencyHint:"interactive"
    });
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

    // Coba paksa output Web Audio ke speaker Bluetooth yang terdeteksi.
    const routed=await routeAudioToBluetooth();

    analyser.connect(audioContext.destination);

    running=true;
    stopBtn.disabled=false;

    if(routed){
      setStatus(true,"MIC AKTIF","Mic HP → Bluetooth → Boom 2 SE.");
    }else{
      setStatus(true,"MIC AKTIF","Mic aktif. Cek apakah suara keluar dari Boom 2 SE.");
    }

    drawMeter();
  }catch(err){
    console.error(err);
    stopMic();
    const msg=err?.name==="NotAllowedError"
      ?"Izin microphone ditolak."
      :err?.name==="NotFoundError"
      ?"Microphone tidak ditemukan."
      :"Gagal mengaktifkan microphone.";
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

  if(audioContext){
    audioContext.close().catch(()=>{});
    audioContext=null;
  }

  source=null;
  gainNode=null;
  compressor=null;
  analyser=null;
  selectedOutputId=null;

  meterBar.style.width="0%";
  levelText.textContent="0%";
  setOutputStatus("Belum memilih output.");

  startBtn.disabled=false;
  stopBtn.disabled=true;
  setStatus(false,"Mic berhenti","Tekan MULAI MIC untuk mencoba lagi.");
}

function drawMeter(){
  if(!running||!analyser)return;

  const data=new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);

  let sum=0;
  for(const v of data){
    const n=(v-128)/128;
    sum+=n*n;
  }

  const rms=Math.sqrt(sum/data.length);
  const pct=Math.min(100,Math.round(rms*220));

  meterBar.style.width=pct+"%";
  levelText.textContent=pct+"%";
  animationId=requestAnimationFrame(drawMeter);
}

startBtn.addEventListener("click",startMic);
stopBtn.addEventListener("click",stopMic);
window.addEventListener("pagehide",stopMic);
