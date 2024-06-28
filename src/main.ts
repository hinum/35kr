import { flavors } from "@catppuccin/palette";
import kaboom, { Color, Key } from "kaboom";
import * as midi from "midi-player-js";
import { instrument } from "soundfont-player";

const k = kaboom({
	width: 1000,
	scale: innerWidth / 1000,
})

const print = <T>(inp: T)=> {
	console.log(inp)
	return inp
}
const colors = Object.fromEntries(Object.entries(flavors.macchiato.colors).map(([name, color])=> [name, k.rgb(color.hex)]))

let noteSpeed = 1 // s
let noteTravelDist = 900
let bgTranspart = 0.6

let judgementWindow = {
	perfect: 0.05,
	good: 0.15,
	miss: 0.4,
}

function initScene(){
	k.camPos(0,0)
  	k.onResize(()=>k.camScale(innerWidth/1000,innerWidth/1000))
	k.setBackground(colors.base)
}

const keyOrder = [
	"    34",
	"56zxcv",
	"asdfgh",
	"qwerty",
	"uiop[]",
	"jkl;'\\",
	"7890-=",
	"n,./  ",
] as const

function keyToLetter(notePitch: number){
	const clampedNote = k.clamp(notePitch, 18, 105) - 12
	const octave = Math.floor( clampedNote / 12)
	const note = Math.floor((clampedNote % 12) / 2)

	return keyOrder[octave][note] as Key
}
function keyToColor(notePitch: number){
	const clampedNote = k.clamp(notePitch, 18, 105) - 12
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

const waitforfileinput = ()=> new Promise<ArrayBuffer>(async res=>{
	const elem = document.querySelector("input") as HTMLInputElement
	elem.addEventListener("change", ()=> res(elem.files?.item(0)?.arrayBuffer()!))
	elem.click()
})

k.scene("game", async (buffer: ArrayBuffer, isauto: boolean = false)=>{
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
	let maxcombo = 0
	const keyPresses: Record<Judgements, number> = {
		good: 0,
		miss: 0,
		perfect: 0
	}
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
			k.pos((time - judgementWindow.miss) / judgementWindow.miss * -100 ,-50),
			k.color(getJudgementColor(judgement))
		])
		
		if (judgement != "miss") combo ++
		else combo = 0

		maxcombo = Math.max(combo, maxcombo)

		keyPresses[judgement] ++
		comboText.text = combo.toString()
	}

	const resloves: Partial<Record<Key, (()=>void)[]>> = {}
	async function waitForInput(timeout: number, key: Key){
		const startTime = k.time()
		resloves[key] ??= []

		if (isauto) await k.wait(timeout / 2)
		else await Promise.race([
			new Promise<void>(res=> resloves[key]!.push(res)),
			k.wait(timeout)
		])

		resloves[key]!.shift()
		return k.time() - startTime
	}
	k.onKeyPress(key=> print(resloves[key])?.[0]?.())

	const player = new midi.Player(async (event: midi.Event)=>{
		if (event.name !== "Note on") return

		const note = k.add([
			k.opacity(bgTranspart),
			k.circle(35),
			k.pos( 600, currentHeight * 70 ),
			k.color(keyToColor(event.noteNumber ?? 0)),
			k.move(k.LEFT, noteTravelDist / noteSpeed),
			k.lifespan(noteSpeed * 2)
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

		await k.wait(noteSpeed - judgementWindow.miss)
		let time = await waitForInput(judgementWindow.miss * 2, keyToLetter(event.noteNumber ?? 0))
		const rawTime = time

		if (rawTime < judgementWindow.miss + judgementWindow.good) note.destroy()
		if (time < judgementWindow.miss) time = judgementWindow.miss - time
		else time -= judgementWindow.miss

		if (time > judgementWindow.good) return registerJudgement(rawTime, "miss")
		if (time < judgementWindow.perfect) registerJudgement(rawTime, "perfect")
		else registerJudgement(rawTime, "good")
		paino.play(event.noteName ?? "")
	})

	const addPop = (txt: string, color: Color)=>k.add([
		k.opacity(1),
		k.text(txt),
		k.pos(0,0),
		k.anchor('center'),
		k.color(color),
		k.lifespan(0.2, {fade: 0.8}),
		{
			velocity: -100,
			update(){
				(this as any).pos.y += (this as any).velocity * k.dt();
				(this as any).velocity += 1000 * k.dt() 
			}
		}
	])
	k.onKeyPress("1", ()=>addPop((noteSpeed += 0.1).toString(), colors.red))
	k.onKeyPress("2", ()=>addPop((noteSpeed -= 0.1).toString(), colors.green))
	k.onKeyPress("3", ()=>addPop((isauto = !isauto)? "true": "false", colors.text))

	if (buffer === undefined){
		await waitForInput(10000000, "space")
		buffer = await waitforfileinput()
	}

	k.add([
		k.rect(70, 100000),
		k.color(colors.surface0),
		k.pos(600 - noteTravelDist, 0),
		k.anchor("right"),
		k.opacity(0),
		k.fadeIn(0.5)
	])
	k.onKeyPress("backspace", ()=>{
		k.go("game", buffer, isauto)
		k.camScale(innerWidth/1000, innerWidth/1000)
		player.stop()
	})

	player.on("endOfFile", ()=>k.wait(2, ()=>k.go('result', keyPresses, maxcombo, buffer)))

	player.loadArrayBuffer(buffer)
	player.play()

})

k.scene("result", (keys: Record<Judgements, number>, maxcombo: number, buffer: ArrayBuffer)=>{
	initScene()
	k.add([
		k.text("perfect | " + keys.perfect),
		k.color(colors.sapphire),
		k.pos(0,-200),
		k.anchor("center")
	]).add([
		k.text("good | " + keys.good),
		k.pos(0, 200/3),
		k.color(colors.green),
		k.anchor("center")
	]).add([
		k.text("miss | " + keys.miss),
		k.pos(0, 200/3),
		k.color(colors.red),
		k.anchor("center")
	]).add([
		k.text("maxcombo | " + maxcombo),
		k.pos(0, 200/3),
		k.color(colors.text),
		k.anchor("center")
	])


	k.onKeyPress('backspace', ()=> k.go("game", buffer))
})

k.go("game")