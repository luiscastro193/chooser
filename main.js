"use strict";
const PI2 = Math.PI * 2;
const radius = 60;
const padding = 40;
const goldenAngle = 180 * (3 - Math.sqrt(5));
const type = document.querySelector('button');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const fingers = new Map();
let resolved = false;

const L = .8;
const C = .3;
const white = `rgba(255, 255, 255, ${L})`;

function oppositeColors() {
	let h = Math.random() * 360;
	return [`oklch(${L} ${C} ${h})`, `oklch(${L} ${C} ${h + 180})`];
}

class ColorGenerator {
	constructor() {
		this.h = Math.random() * 360;
		this.discarded = [];
	}
	
	next() {
		if (this.discarded.length) return this.discarded.pop();
		const h = this.h;
		this.h += goldenAngle;
		return `oklch(${L} ${C} ${h})`;
	}
	
	discard(color) {
		this.discarded.push(color);
	}
}

type.onclick = () => {
	type.textContent = type.textContent == 'Finger' ? 'Groups' : 'Finger';
};

let colorGenerator = new ColorGenerator();

function resizeCanvas() {
	const size = canvas.getBoundingClientRect();
	canvas.width = Math.ceil(size.width * devicePixelRatio);
	canvas.height = Math.ceil(size.height * devicePixelRatio);
	ctx.resetTransform();
	ctx.scale(canvas.width / size.width, canvas.height / size.height);
}

addEventListener("resize", resizeCanvas);
resizeCanvas();

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
		let j = Math.trunc(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	
	return array;
}

function resolve() {
	resolved = true;
	let ids = [...fingers.keys()];
	
	if (type.textContent == "Finger") {
		const winnerId = ids[Math.trunc(Math.random() * ids.length)];
		const winner = fingers.get(winnerId);
		winner.isWinner = true;
		fingers.clear();
		fingers.set(winnerId, winner);
	}
	else {
		ids = shuffle(ids);
		const middleIndex = (ids.length - 1) / 2;
		const colors = oppositeColors();
		
		for (let i = 0; i < ids.length; i++)
			fingers.get(ids[i]).color = i < middleIndex ? colors[0] : colors[1];
	}
}

let timeout;

function setMyTimeout() {
	clearTimeout(timeout);
	
	if (!resolved && fingers.size >= 2)
		timeout = setTimeout(resolve, 2500);
}

function setFinger(event) {
	event.preventDefault();
	
	if (!resolved) {
		type.disabled = true;
		
		fingers.set(event.pointerId, {
			x: event.offsetX,
			y: event.offsetY,
			color: type.textContent == "Finger" ? colorGenerator.next() : white
		});
		
		setMyTimeout();
	}
}

function updateFinger(event) {
	const finger = fingers.get(event.pointerId);
	
	if (finger) {
		finger.x = event.offsetX;
		finger.y = event.offsetY;
	}
}

async function deleteFinger(event) {
	const color = fingers.get(event.pointerId)?.color;
	
	if (color) {
		if (resolved) await new Promise(resolve => setTimeout(resolve, 2000));
		fingers.delete(event.pointerId);
		
		if (fingers.size)
			colorGenerator.discard(color);
		else {
			colorGenerator = new ColorGenerator();
			resolved = false;
			type.disabled = false;
		}
		
		setMyTimeout();
	}
}

canvas.addEventListener('pointerdown', setFinger);
canvas.addEventListener('pointermove', updateFinger);
canvas.addEventListener('pointerup', deleteFinger);
canvas.addEventListener('pointercancel', deleteFinger);

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	for (const finger of fingers.values()) {
		ctx.beginPath();
		ctx.arc(finger.x, finger.y, radius, 0, PI2);
		ctx.fillStyle = finger.color;
		ctx.fill();
		
		if (finger.isWinner) {
			ctx.beginPath();
			ctx.rect(0, 0, canvas.width, canvas.height);
			ctx.arc(finger.x, finger.y, radius + padding, 0, PI2);
			ctx.fill('evenodd');
		}
	}
	
	requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
type.textContent = 'Finger';
