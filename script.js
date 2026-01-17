const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const penTool = document.getElementById("penTool");
const markerTool = document.getElementById("markerTool");
const eraserTool = document.getElementById("eraserTool");
const bucketTool = document.getElementById("bucketTool");

const colorPicker = document.getElementById("colorPicker");
const sizePicker = document.getElementById("sizePicker");

let tool = "pen";
let drawing = false;
let lastX = 0;
let lastY = 0;

/* =========================
   ZOOM STATE
========================= */
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let lastDistance = null;

/* =========================
   MAPA
========================= */
const mapImage = new Image();
mapImage.src = "img/mapa.png";
mapImage.onload = () => {
  canvas.width = mapImage.naturalWidth;
  canvas.height = mapImage.naturalHeight;
  redraw();
};

function redraw(){
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  ctx.clearRect(
    -offsetX / scale,
    -offsetY / scale,
    canvas.width / scale,
    canvas.height / scale
  );
  ctx.drawImage(mapImage, 0, 0);
}

/* =========================
   TOOL SELECT
========================= */
penTool.onclick = () => tool = "pen";
markerTool.onclick = () => tool = "marker";
eraserTool.onclick = () => tool = "eraser";
bucketTool.onclick = () => tool = "bucket";

/* =========================
   POSITION FIX
========================= */
function getPos(e){
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left - offsetX) / scale,
    y: (e.clientY - rect.top - offsetY) / scale
  };
}

/* =========================
   DRAW
========================= */
canvas.addEventListener("pointerdown", e => {
  if(e.pointerType === "touch" && e.touches?.length === 2) return;

  const {x, y} = getPos(e);

  if(tool === "bucket"){
    floodFill(Math.floor(x), Math.floor(y));
    return;
  }

  drawing = true;
  lastX = x;
  lastY = y;
});

canvas.addEventListener("pointermove", e => {
  if(!drawing) return;

  const {x, y} = getPos(e);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if(tool === "pen"){
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = sizePicker.value;
  }

  if(tool === "marker"){
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = sizePicker.value * 2;
  }

  if(tool === "eraser"){
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = sizePicker.value * 2;
  }

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();

  lastX = x;
  lastY = y;
});

canvas.addEventListener("pointerup", () => drawing = false);

/* =========================
   PINCH ZOOM (MÓVIL)
========================= */
canvas.addEventListener("touchmove", e => {
  if(e.touches.length !== 2) return;

  e.preventDefault();

  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  const distance = Math.hypot(dx, dy);

  if(lastDistance){
    const zoom = distance / lastDistance;
    scale *= zoom;
    scale = Math.min(Math.max(scale, 0.5), 4);
    redraw();
  }

  lastDistance = distance;
}, { passive:false });

canvas.addEventListener("touchend", () => {
  lastDistance = null;
});

/* =========================
   FLOOD FILL
========================= */
function floodFill(x, y){
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  const target = getColor(data, x, y);
  const fill = hexToRgba(colorPicker.value);
  if(matchColor(target, fill)) return;

  const stack = [[x,y]];
  while(stack.length){
    const [cx,cy] = stack.pop();
    const i = (cy * canvas.width + cx) * 4;
    if(!matchColor(getColor(data,cx,cy), target)) continue;

    data[i]=fill[0]; data[i+1]=fill[1];
    data[i+2]=fill[2]; data[i+3]=255;

    if(cx>0) stack.push([cx-1,cy]);
    if(cx<canvas.width-1) stack.push([cx+1,cy]);
    if(cy>0) stack.push([cx,cy-1]);
    if(cy<canvas.height-1) stack.push([cx,cy+1]);
  }
  ctx.putImageData(img,0,0);
}

function getColor(d,x,y){
  const i=(y*canvas.width+x)*4;
  return [d[i],d[i+1],d[i+2],d[i+3]];
}

function matchColor(a,b){
  return a[0]==b[0]&&a[1]==b[1]&&a[2]==b[2]&&a[3]==b[3];
}

function hexToRgba(h){
  return [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16),
    255
  ];
}
