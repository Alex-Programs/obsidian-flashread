import {App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';

interface FlashreadSettings {
	wpm: string;
	wordcount: string;
}

const DEFAULT_SETTINGS: FlashreadSettings = {
	wpm: '600',
	wordcount: '1'
}

export default class Flashread extends Plugin {
	settings: FlashreadSettings;

	async onload() {
		await this.loadSettings();

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'SpeedReadCmd',
			name: 'Speed Read',
			editorCallback: (editor, view) => {
				new ViewModal(this.app, parseInt(this.settings.wordcount), parseFloat(this.settings.wpm)).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new FlashreadSettingsTab(this.app, this));

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class Flash {
	public text: string;

	constructor(text: string) {
		this.text = text;
	}
}

class ViewModal extends Modal {
	private selection: string;
	private displayer: HTMLElement;
	private flashes: Flash[];
	private wordcount: number;
	private wpm: number;
	private index: number = 0;

	constructor(app: App, wordcount : number, wpm : number) {
		super(app);
		this.wordcount = wordcount
		this.wpm = wpm
	}

	onOpen() {
		let {contentEl} = this;
		this.selection = this.getSelection()

		const displayerNode = document.createElement("div")

		const displayerNodeContent = document.createTextNode("Loading...")

		displayerNode.appendChild(displayerNodeContent);

		this.displayer = contentEl.appendChild(displayerNode) as HTMLElement

		this.displayer.classList.add("displayer")
		contentEl.classList.add("displayer-wrapper")

		this.flashes = this.createFlashes(this.selection);

		setInterval(this.flash.bind(this), (60 * 1000 * this.wordcount) / this.wpm)
	}

	flash() {
		if (this.index == this.flashes.length) {
			return
		}

		this.displayer.childNodes[0].nodeValue = this.flashes[this.index].text

		this.index = this.index + 1
	}

	createFlashes(selection: string) {
		const removeChars = ["\t", "![[", "[[", "]]", "\n", /Pasted image [0-9]+.png/]
		for (let i = 0; i < removeChars.length; i++) {
			selection = selection.split(removeChars[i]).join(" ")
		}

		const words = selection.split(" ")

		let output: Flash[] = []

		let buff: string = "";
		let buffWords: number = 0;

		for (let index in words) {
			const word = words[index]

			if (word.split("#").join("").length == 0) {
				continue
			}

			if (buffWords == this.wordcount) {
				output.push(new Flash(buff))

				buff = ""

				buffWords = 0;

				continue
			}

			buff = buff + " " + word
			buffWords++;
		}

		output.push(new Flash(buff))

		return output
	}

	onClose() {
		let {contentEl} = this;
		contentEl.empty();
	}

	getSelection() {
		let view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			// View can be null some times. Can't do anything in this case.
		} else {
			let view_mode = view.getMode(); // "preview" or "source" (can also be "live" but I don't know when that happens)
			switch (view_mode) {
				case "preview":
					// The leaf is in preview mode, which makes things difficult.
					// I don't know how to get the selection when the editor is in preview mode :(
					break;
				case "source":
					// Ensure that view.editor exists!
					if ("editor" in view) {
						// Good, it exists.
						// @ts-ignore We already know that view.editor exists.
						return view.editor.getSelection(); // THIS IS THE SELECTED TEXT, use it as you wish.
					}
					// If we get here, then 'view' does not have a property named 'editor'.
					break;
				default:
					// If we get here, then we did not recognise 'view_mode'.
					break;
			}
		}
	}
}

class FlashreadSettingsTab extends PluginSettingTab {
	plugin: Flashread;

	constructor(app: App, plugin: Flashread) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Obsidian Flashread'});

		new Setting(containerEl)
			.setName('Speed')
			.setDesc('(WPM)')
			.addText(text => text
				.setValue(this.plugin.settings.wpm)
				.onChange(async (value) => {
					this.plugin.settings.wpm = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Word Count')
			.setDesc("Amount of words per flash.")
			.addText(text => text
				.setValue(this.plugin.settings.wordcount)
				.onChange(async (value) => {
					this.plugin.settings.wordcount = value;
					await this.plugin.saveSettings();
				}));
	}
}
