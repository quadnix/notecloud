app = new Vue({
	el: '#app',
	data: {
		notes: [],
		socket: null,
		search: '',
		viewActive: false,
		note: {},
		settingsOpen: false,

		// render options
		renderMarkdown: false,
		renderMathjax: false,
		renderHTML: false,
		renderCodeHighlighting: false,
		scrollOnUpdate: false
	},
	created: function() {
		// load in the note list
		this.loadNotes();
		this.socket = io();

		this.socket.on('reload', _ => location.reload());

		this.socket.on('change', this.updateNotes);
	},

	methods: {
		loadNotes: function() {
			this.$http.get('/api/root')
				.then(res => res.json())
				.then(res => this.notes = res.files);
		},
		getNotes: function() {
			var filter = new RegExp(this.search, 'i')
			return this.notes.filter(el => filter.test(el.path));
		},
		updateNotes: function(ev) {
			if (ev.event == 'change') {

				this.displayNote(this.note.path);
			} else {
				this.loadNotes();
			}
		},
		displayNote: function(note) {
			fetch('/api/note' + note)
				.then(res => res.json())
				.then(res => {
					this.note = res;
				});
			this.showNoteView();
		},
		displayTopNote: function() {
			var notes = this.getNotes();
			if (notes.length > 0) {
				this.displayNote(notes[0].path);
			}
			
		},
		showNoteView: function() {
			this.viewActive = true;
		},
		hideNoteView: function() {
			this.viewActive = false;
		},
		compile: function() {
			if (this.note.raw) {
				if (this.renderMarkdown) {
					return marked(this.note.raw, {
						sanitize: !this.renderHTML
					});
				} else {
					if (this.renderHTML) {
						return this.note.raw;
					}
					var raw = this.note.raw;
					raw = raw.replace('&', '&amp;');
					raw = raw.replace('<', '&lt;');
					raw = raw.replace('>', '&gt;');
					return raw;
				}
			}
		},
		toggleSettings: function() {
			this.settingsOpen = !this.settingsOpen;
		},
		toggleSetting: function(ev) {
			var toggle = ev.target.getAttribute('data-toggles');
			this[toggle] = !this[toggle];

			this.doPostRender();

		},
		scrollToBottom: function(force) {
			var view = document.getElementById('view');
			if (this.scrollOnUpdate || force) {
				view.scrollTop = view.scrollHeight;
			}
		},
		highlightCode: function() {
			var codeblocks = document.getElementsByTagName('code');
			for (var i = 0; i < codeblocks.length; i++) {
				var el = codeblocks[i];
				if (el.parentNode.tagName != 'PRE') {
					// skip inline blocks
					continue;
				}
				if (/lang\-/.test(el.className)) {
					el.className += ' ' + el.className.replace('lang-', '');
				}
				hljs.highlightBlock(el);
			}
		},
		doPostRender: function() {
			this.scrollToBottom();

			// code highlighting
			if (this.renderCodeHighlighting) {
				setTimeout(_ => {
					this.highlightCode();
					this.scrollToBottom();
				}, 100);
			}

			// rerender stuff
			if (this.renderMathjax) {
				setTimeout(_ => {
					MathJax.Hub.Queue(['Typeset', MathJax.Hub])
					MathJax.Hub.Queue(this.scrollToBottom.bind(this));
				}, 100)
			} else {
				// check if we have anything to do
				if (document.getElementsByClassName('MathJax').length == 0) {

					return;
				}
				// a bit hacky, but it works
				var note = this.note.raw;
				this.note.raw = '';
				try {
					document.getElementById('noterender-raw').innerHTML = '';
				} catch (e) {};
				setTimeout(_ => {
					this.note.raw = note;
				}, 100);
			}
		},
		encodeQueryData: function(data) {
			let ret = [];
			for (let d in data)
				ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
			return ret.join('&');
		},
                getPrintLink: function() {
                        return '/view.html?' + this.encodeQueryData({path: this.note.path});
                }

	},
	watch: {
		note: function() {
			this.doPostRender();
		}
	}
})
