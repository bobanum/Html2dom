export default class Html2dom {
	static traduire(str) {
		var dom = document.createElement("div");
		dom.innerHTML = str;
		this.variables = [];
		var resultat = "";
		var nodes = Array.from(dom.childNodes);
		nodes.forEach(node => {
			var nomVariable = this.nomVariable(node);
			resultat += `var ${nomVariable} = document.createElement("${node.localName}");\r\n`;
			resultat += this.attributs(nomVariable, node);
			resultat += this.contenu(node.childNodes, nomVariable);
			this.supprimerVariable(nomVariable);
		});
		return resultat;
	}
	static attributs(nomVariable, node) {
		var dummy = document.createElement("div");
		var resultat = "";
		var attributs = Array.from(node.attributes);
		attributs.forEach(attribut => {
			var name = attribut.localName;
			var value = attribut.nodeValue.replace(/"/g, "&quot;");
			console.log(value);
			if (name === "class") {
				resultat += this.classes(nomVariable, value);
			} else if (name === "style") {
				resultat += this.styles(nomVariable, value);
			} else {
				resultat += `${nomVariable}.setAttribute("${name}", "${value}");\r\n`;
			}
		});
		return resultat;
	}
	static classes(nomVariable, classes) {
		var resultat = "";
		classes = classes.trim().split(/\s+/);
		classes.forEach(classe => {
			resultat += `${nomVariable}.classList.add("${classe}");\r\n`;
		});
		return resultat;
	}
	static styles(nomVariable, styles) {
		var resultat = "";
		var styles = styles.trim().split(/(?: *; *)+/);
		styles.forEach(style => {
			if (!style.trim()) {
				return;
			}
			var [nomProp, valProp] = style.split(/\s*:\s*/);
			if (nomProp.substr(0,2) === "--") {
				resultat += `${nomVariable}.style.setProperty("${nomProp}", "${valProp}");\r\n`;
			} else {
				nomProp = nomProp.split("-")[0] + nomProp.split("-").slice(1).map(part => part[0].toUpperCase() + part.substr(1)).join("");
				resultat += `${nomVariable}.style.${nomProp} = "${valProp}";\r\n`;
			}
		});
		return resultat;
	}
	static nomVariable(node) {
		var nomVariable = node.localName;
		if (nomVariable === "#text") {
			return false;
		}
		if (node.getAttribute("id")) {
			nomVariable = node.getAttribute("id");
		}
		if (this.variables.indexOf(nomVariable) >= 0) {
			let no = 2;
			while (this.variables.indexOf(nomVariable + no) >= 0) {
				no += 1;
			}
			nomVariable += no;
		}
		this.variables.push(nomVariable);
		return nomVariable;
	}
	static supprimerVariable(nomVariable) {
		var pos = this.variables.indexOf(nomVariable);
		if (pos < 0) {
			return;
		}
		this.variables.splice(pos, 1);
	}
	static contenu(nodes, nomParent) {
		var resultat = "";
		var nodes = Array.from(nodes);
		nodes = nodes.filter(node => node.nodeName !== "#text" || node.nodeValue.trim());
		if (nodes.length === 1 && nodes[0].nodeName === "#text") {
			if (nomParent) {
				resultat += `${nomParent}.innerHTML = "${nodes[0].nodeValue}";\r\n`;
			} else {
				resultat += `document.createTextNode("${nodes[0].nodeValue}");\r\n`;
			}
			return resultat;
		}
		nodes.forEach(node => {
			var nomVariable = this.nomVariable(node);
			if (nomVariable) {
				if (nomParent) {
					resultat += `var ${nomVariable} = ${nomParent}.appendChild(document.createElement("${node.localName}"));\r\n`;
				} else {
					resultat += `var ${nomVariable} = document.createElement("${node.localName}");\r\n`;
				}
				resultat += this.attributs(nomVariable, node);
				resultat += this.contenu(node.childNodes, nomVariable);
			} else {
				if (nomParent) {
					resultat += `${nomParent}.appendChild(document.createTextNode("${node.nodeValue}"));\r\n`;
				} else {
					resultat += `document.createTextNode("${node.nodeValue}");\r\n`;
				}
			}
			this.supprimerVariable(nomVariable);
		});
		return resultat;
	}
}
console.log(Html2dom.traduire('<table id="stats" border="&quot;1" class="c1 c2" style="--variable: 123;border-width:1px solid black;border-color:red;">   <tbody><tr class="selecteur"><th>Sélecteur :</th><td></td></tr><tr class="signification"><th>Signification :</th><td>Une balise ayant la classe «bas»</td></tr></tbody></table>'));
