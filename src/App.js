/*jslint browser:true, esnext:true */
import Html2dom from "./Html2dom.js";
export default class App {
	static main() {
		this.form = document.getElementById("html2dom");
		this.form.addEventListener("submit", e => {
			e.preventDefault();
			var htmlIn = e.target.htmlIn.value;
			var result = Html2dom.translate(htmlIn);
			e.target.domOut.value = result;
			return false;
		});
	}
	static load() {
		return new Promise(resolve => {
			window.addEventListener("load", e => {
				resolve(e);
			});
		}).then(data => {
			return this.main(data);
		});
	}
}
