"use strict";
const PI2 = Math.PI * 2;
const radius = 60;
const padding = 40;
const goldenAngle = 180 * (3 - Math.sqrt(5));
const styles = document.getElementById('styles');
const type = document.querySelector('button');
const canvas = document.querySelector('canvas');
const gamut = matchMedia('(color-gamut: p3)').matches ? 'p3' : 'srgb';
const ctx = canvas.getContext('2d', {colorSpace: gamut == 'p3' ? 'display-p3' : 'srgb'});
const fingers = new Map();
let resolved = false;

const white = "rgba(255, 255, 255, .9)";
let oklchColor = h => `oklch(.8 .3 ${h})`;

import('https://colorjs.io/dist/color.min.js').then(module => {
	const bestColor = (L, h) => new module.default('oklch', [L, .4, h]).toGamut({space: gamut, method: 'raytrace'});
	
	oklchColor = h => {
		let lo = .4, hi = 1;

		while (hi - lo > .0001) {
			const third = (hi - lo) / 3;
			const m1 = lo + third;
			const m2 = hi - third;
			if (bestColor(m1, h).c <= bestColor(m2, h).c) lo = m1;
			else hi = m2;
		}

		return bestColor((lo + hi) / 2, h).toString({inGamut: false});
	}
	
	function recolor(color) {
		const h = color.match(/oklch\(.+ (.+)\)/)?.[1];
		return h ? oklchColor(h) : color;
	}
	
	colorGenerator.discarded = colorGenerator.discarded.map(recolor);
	for (const finger of fingers.values()) finger.color = recolor(finger.color);
});

function oppositeColors() {
	let h = Math.random() * 360;
	return [oklchColor(h), oklchColor(h + 180)];
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
		return oklchColor(h);
	}
	
	discard(color) {
		this.discarded.push(color);
	}
}

type.onclick = () => {
	type.textContent = type.textContent == 'Finger' ? 'Groups' : 'Finger';
};

let colorGenerator = new ColorGenerator();

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
	
	if (type.textContent == 'Finger') {
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
	if (!resolved) {
		canvas.setPointerCapture(event.pointerId);
		type.disabled = true;
		
		fingers.set(event.pointerId, {
			x: event.offsetX,
			y: event.offsetY,
			color: type.textContent == 'Finger' ? colorGenerator.next() : white
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

let width, height;

function resizeCanvas([resizeEntry]) {
	width = resizeEntry.contentBoxSize[0].inlineSize;
	height = resizeEntry.contentBoxSize[0].blockSize;
	canvas.width = resizeEntry.devicePixelContentBoxSize?.[0].inlineSize || Math.ceil(width * devicePixelRatio);
	canvas.height = resizeEntry.devicePixelContentBoxSize?.[0].blockSize || Math.ceil(height * devicePixelRatio);
	ctx.scale(canvas.width / width, canvas.height / height);
}

function draw() {
	ctx.clearRect(0, 0, width, height);
	
	for (const finger of fingers.values()) {
		ctx.beginPath();
		ctx.arc(finger.x, finger.y, radius, 0, PI2);
		ctx.fillStyle = finger.color;
		ctx.fill();
		
		if (finger.isWinner) {
			ctx.beginPath();
			ctx.rect(0, 0, width, height);
			ctx.arc(finger.x, finger.y, radius + padding, 0, PI2);
			ctx.fill('evenodd');
		}
	}
	
	requestAnimationFrame(draw);
}

while (!styles.sheet.cssRules.length)
	await new Promise(resolve => requestAnimationFrame(resolve));

requestAnimationFrame(() => {
	new ResizeObserver(resizeCanvas).observe(canvas);
	requestAnimationFrame(draw);
});

type.textContent = 'Finger';
