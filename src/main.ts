import { flavors } from "@catppuccin/palette";
import kaboom, { Color, Key } from "kaboom";
import * as midi from "midi-player-js";
import { instrument } from "soundfont-player";

const k = kaboom({
	width: 1000,
	scale: innerWidth / 1000,
})

const colors = Object.fromEntries(Object.entries(flavors.macchiato.colors).map(([name, color])=> [name, k.rgb(color.hex)]))

type JudgementWindows = {
	perfect: number, // in ms
	good: number,
}

let noteSpeed = 2 // s
let noteTravelDist = 900
let bgTranspart = 0.6

let judgementWindow: JudgementWindows = {
	perfect: 0.05,
	good: 0.15,
}

function initScene(){
	k.camPos(0,0)
  	k.onResize(()=>k.camScale(innerWidth/1000,innerWidth/1000))
	k.setBackground(colors.base)
}

const waitForInput = (timeout:number, chacracter: Key)=>new Promise<number>(async (res, fail)=>{
	const startTime = k.time()
	const collector = k.onKeyPress(chacracter, ()=>res(k.time() - startTime))

	await k.wait(timeout)
	collector.cancel()
	res(999999)
})

const keyOrder = [
	"  1234",
	"56zxcv",
	"asdfgh",
	"qwerty",
	"uiop[]",
	"jkl;'\\",
	"7890-=",
	"n,./  ",
] as const

function keyToLetter(notePitch: number){
	const clampedNote = k.clamp(notePitch, 16, 105) - 12
	const octave = Math.floor( clampedNote / 12)
	const note = Math.floor((clampedNote % 12) / 2)

	return keyOrder[octave][note] as Key
}
function keyToColor(notePitch: number){
	const clampedNote = k.clamp(notePitch, 16, 105) - 12
	const octave = Math.floor( clampedNote / 12)

	return [
		colors.mauve,
		colors.mauve,
		colors.red,
		colors.yellow,
		colors.green,
		colors.sky,
		colors.blue,
		colors.blue,
	][octave]
}

type Judgements = "perfect" | "good" | "miss"
function getJudgementColor(judgement: Judgements){
	switch (judgement){
		case "perfect": return colors.sapphire
		case "good": return colors.green
		case "miss": return colors.overlay0
	}
}

k.scene("game", async (songFile: string)=>{
	initScene() 
	const paino = await instrument(k.audioCtx, "acoustic_grand_piano")
	let currentHeight = 0

	const judgementText = k.add([
		k.text(""),
		k.pos(0, -110),
		k.color(),
		k.anchor("top")
	])
	let combo = 0
	const comboText =  judgementText.add([
		k.text("", {size : 20}),
		k.pos(0, -5),
		k.color(),
		k.anchor("bot")
	])
	function registerJudgement(time: number, judgement: Judgements){
		judgementText.text = judgement
		judgementText.color = getJudgementColor(judgement)
		k.add([
			k.rect(5,20, {radius:2.5}),
			k.lifespan(1, {fade: 0.5}),
			k.anchor("bot"),
			k.opacity(0.75),
			k.pos((time - judgementWindow.good) / judgementWindow.good * 100 ,-50),
			k.color(getJudgementColor(judgement))
		])
		
		if (judgement != "miss") combo ++
		else combo = 0

		comboText.text = combo.toString()
	}

	const player = new midi.Player(async (event: midi.Event)=>{
		if (event.name !== "Note on") return
		console.log(event.noteName)
		const spawnTime = k.time()

		const note = k.add([
			k.opacity(bgTranspart),
			k.circle(35),
			k.pos( 600, currentHeight * 70 ),
			k.color(keyToColor(event.noteNumber ?? 0)),
			k.move(k.LEFT, noteTravelDist / noteSpeed),
			k.lifespan(noteSpeed  , { fade: 0 })
		])

		note.add([
			k.text(keyToLetter(event.noteNumber ?? 0)),
			k.anchor("center"),
			k.color(colors.text),
			k.opacity(1),
			{
				update(){
					(this as any).opacity = note.opacity * (1/bgTranspart)
				}
			}
		])

		if (currentHeight === 0) k.wait((noteSpeed / noteTravelDist) * 90, ()=> currentHeight = 0)
		currentHeight += 1 // a black note after a white one could cause issues ( A# after A for example )

		await k.wait(noteSpeed)
		let time = await waitForInput(judgementWindow.good * 2, keyToLetter(event.noteNumber ?? 0))
		const rawTime = time

		if (time < judgementWindow.good) time = judgementWindow.good - time
		else time -= judgementWindow.good

		if (time > judgementWindow.good) return registerJudgement(rawTime, "miss")
		if (time < judgementWindow.perfect) registerJudgement(rawTime, "perfect")
		else registerJudgement(rawTime, "good")
		paino.play(event.noteName ?? "")
	})

	const buffer = await fetch(songFile).then(res=>res.arrayBuffer())
	k.add([
		k.rect(10, 100000),
		k.color(colors.surface0),
		k.pos(600 - noteTravelDist - 35, 0),
		k.anchor("left"),
		k.opacity(0),
		k.fadeIn(0.5)
	])
	k.onKeyPress("backspace", ()=>{
		k.go("game", songFile)
		player.stop()
	})

	player.loadArrayBuffer(buffer)
	player.play()

})

k.scene("songResult", ()=>{})
k.scene("songSelect", ()=>{})
k.scene("settings", ()=>{})

k.go("game", "Mary Had a Little Lamb.mid")