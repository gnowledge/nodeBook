import {
  __commonJS
} from "./chunk-2TUXWMP5.js";

// node_modules/cytoscape-svg/cytoscape-svg.js
var require_cytoscape_svg = __commonJS({
  "node_modules/cytoscape-svg/cytoscape-svg.js"(exports, module) {
    !function(t, e) {
      "object" == typeof exports && "object" == typeof module ? module.exports = e() : "function" == typeof define && define.amd ? define([], e) : "object" == typeof exports ? exports.cytoscapeSvg = e() : t.cytoscapeSvg = e();
    }(window, function() {
      return function(t) {
        var e = {};
        function r(i) {
          if (e[i]) return e[i].exports;
          var n = e[i] = { i, l: false, exports: {} };
          return t[i].call(n.exports, n, n.exports, r), n.l = true, n.exports;
        }
        return r.m = t, r.c = e, r.d = function(t2, e2, i) {
          r.o(t2, e2) || Object.defineProperty(t2, e2, { enumerable: true, get: i });
        }, r.r = function(t2) {
          "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(t2, "__esModule", { value: true });
        }, r.t = function(t2, e2) {
          if (1 & e2 && (t2 = r(t2)), 8 & e2) return t2;
          if (4 & e2 && "object" == typeof t2 && t2 && t2.__esModule) return t2;
          var i = /* @__PURE__ */ Object.create(null);
          if (r.r(i), Object.defineProperty(i, "default", { enumerable: true, value: t2 }), 2 & e2 && "string" != typeof t2) for (var n in t2) r.d(i, n, (function(e3) {
            return t2[e3];
          }).bind(null, n));
          return i;
        }, r.n = function(t2) {
          var e2 = t2 && t2.__esModule ? function() {
            return t2.default;
          } : function() {
            return t2;
          };
          return r.d(e2, "a", e2), e2;
        }, r.o = function(t2, e2) {
          return Object.prototype.hasOwnProperty.call(t2, e2);
        }, r.p = "", r(r.s = 0);
      }([function(t, e, r) {
        "use strict";
        var i = r(1), n = function(t2) {
          t2 && t2("core", "svg", i.svg);
        };
        "undefined" != typeof cytoscape && n(cytoscape), t.exports = n;
      }, function(t, e, r) {
        "use strict";
        var i = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t2) {
          return typeof t2;
        } : function(t2) {
          return t2 && "function" == typeof Symbol && t2.constructor === Symbol && t2 !== Symbol.prototype ? "symbol" : typeof t2;
        }, n = r(2), o = {}, s = {};
        s.number = function(t2) {
          return null != t2 && (void 0 === t2 ? "undefined" : i(t2)) === i(1) && !isNaN(t2);
        }, o.bufferCanvasImage = function(t2, e2) {
          var r2 = e2.renderer().usePaths;
          e2.renderer().usePaths = function() {
            return false;
          }, e2.elements().forEach(function(t3) {
            t3._private.rscratch.pathCacheKey = null, t3._private.rscratch.pathCache = null;
          });
          var i2 = e2.renderer(), o2 = e2.mutableElements().boundingBox(), a = i2.findContainerClientCoords(), l = t2.full ? Math.ceil(o2.w) : a[2], h = t2.full ? Math.ceil(o2.h) : a[3], c = s.number(t2.maxWidth) || s.number(t2.maxHeight), p = i2.getPixelRatio(), u = 1;
          if (void 0 !== t2.scale) l *= t2.scale, h *= t2.scale, u = t2.scale;
          else if (c) {
            var _ = 1 / 0, d = 1 / 0;
            s.number(t2.maxWidth) && (_ = u * t2.maxWidth / l), s.number(t2.maxHeight) && (d = u * t2.maxHeight / h), l *= u = Math.min(_, d), h *= u;
          }
          c || (l *= p, h *= p, u *= p);
          var f = null, g = f = new n(l, h);
          if (l > 0 && h > 0) {
            f.clearRect(0, 0, l, h), t2.bg && (f.globalCompositeOperation = "destination-over", f.fillStyle = t2.bg, f.fillRect(0, 0, l, h)), f.globalCompositeOperation = "source-over";
            var m = i2.getCachedZSortedEles();
            if (t2.full) f.translate(-o2.x1 * u, -o2.y1 * u), f.scale(u, u), i2.drawElements(f, m), f.scale(1 / u, 1 / u), f.translate(o2.x1 * u, o2.y1 * u);
            else {
              var y = e2.pan(), v = { x: y.x * u, y: y.y * u };
              u *= e2.zoom(), f.translate(v.x, v.y), f.scale(u, u), i2.drawElements(f, m), f.scale(1 / u, 1 / u), f.translate(-v.x, -v.y);
            }
          }
          return e2.renderer().usePaths = r2, g;
        }, o.svg = function(t2) {
          return o.bufferCanvasImage(t2 || {}, this).getSerializedSvg();
        }, t.exports = o;
      }, function(t, e, r) {
        !function() {
          "use strict";
          var e2, r2, i, n, o;
          function s(t2, e3) {
            var r3, i2 = Object.keys(e3);
            for (r3 = 0; r3 < i2.length; r3++) t2 = t2.replace(new RegExp("\\{" + i2[r3] + "\\}", "gi"), e3[i2[r3]]);
            return t2;
          }
          function a(t2) {
            var e3, r3, i2;
            if (!t2) throw new Error("cannot create a random attribute name for an undefined object");
            e3 = "ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz", r3 = "";
            do {
              for (r3 = "", i2 = 0; i2 < 12; i2++) r3 += e3[Math.floor(Math.random() * e3.length)];
            } while (t2[r3]);
            return r3;
          }
          function l(t2) {
            var e3 = { alphabetic: "alphabetic", hanging: "hanging", top: "text-before-edge", bottom: "text-after-edge", middle: "central" };
            return e3[t2] || e3.alphabetic;
          }
          o = function(t2, e3) {
            var r3, i2, n2, o2 = {};
            for (t2 = t2.split(","), e3 = e3 || 10, r3 = 0; r3 < t2.length; r3 += 2) i2 = "&" + t2[r3 + 1] + ";", n2 = parseInt(t2[r3], e3), o2[i2] = "&#" + n2 + ";";
            return o2["\\xa0"] = "&#160;", o2;
          }("50,nbsp,51,iexcl,52,cent,53,pound,54,curren,55,yen,56,brvbar,57,sect,58,uml,59,copy,5a,ordf,5b,laquo,5c,not,5d,shy,5e,reg,5f,macr,5g,deg,5h,plusmn,5i,sup2,5j,sup3,5k,acute,5l,micro,5m,para,5n,middot,5o,cedil,5p,sup1,5q,ordm,5r,raquo,5s,frac14,5t,frac12,5u,frac34,5v,iquest,60,Agrave,61,Aacute,62,Acirc,63,Atilde,64,Auml,65,Aring,66,AElig,67,Ccedil,68,Egrave,69,Eacute,6a,Ecirc,6b,Euml,6c,Igrave,6d,Iacute,6e,Icirc,6f,Iuml,6g,ETH,6h,Ntilde,6i,Ograve,6j,Oacute,6k,Ocirc,6l,Otilde,6m,Ouml,6n,times,6o,Oslash,6p,Ugrave,6q,Uacute,6r,Ucirc,6s,Uuml,6t,Yacute,6u,THORN,6v,szlig,70,agrave,71,aacute,72,acirc,73,atilde,74,auml,75,aring,76,aelig,77,ccedil,78,egrave,79,eacute,7a,ecirc,7b,euml,7c,igrave,7d,iacute,7e,icirc,7f,iuml,7g,eth,7h,ntilde,7i,ograve,7j,oacute,7k,ocirc,7l,otilde,7m,ouml,7n,divide,7o,oslash,7p,ugrave,7q,uacute,7r,ucirc,7s,uuml,7t,yacute,7u,thorn,7v,yuml,ci,fnof,sh,Alpha,si,Beta,sj,Gamma,sk,Delta,sl,Epsilon,sm,Zeta,sn,Eta,so,Theta,sp,Iota,sq,Kappa,sr,Lambda,ss,Mu,st,Nu,su,Xi,sv,Omicron,t0,Pi,t1,Rho,t3,Sigma,t4,Tau,t5,Upsilon,t6,Phi,t7,Chi,t8,Psi,t9,Omega,th,alpha,ti,beta,tj,gamma,tk,delta,tl,epsilon,tm,zeta,tn,eta,to,theta,tp,iota,tq,kappa,tr,lambda,ts,mu,tt,nu,tu,xi,tv,omicron,u0,pi,u1,rho,u2,sigmaf,u3,sigma,u4,tau,u5,upsilon,u6,phi,u7,chi,u8,psi,u9,omega,uh,thetasym,ui,upsih,um,piv,812,bull,816,hellip,81i,prime,81j,Prime,81u,oline,824,frasl,88o,weierp,88h,image,88s,real,892,trade,89l,alefsym,8cg,larr,8ch,uarr,8ci,rarr,8cj,darr,8ck,harr,8dl,crarr,8eg,lArr,8eh,uArr,8ei,rArr,8ej,dArr,8ek,hArr,8g0,forall,8g2,part,8g3,exist,8g5,empty,8g7,nabla,8g8,isin,8g9,notin,8gb,ni,8gf,prod,8gh,sum,8gi,minus,8gn,lowast,8gq,radic,8gt,prop,8gu,infin,8h0,ang,8h7,and,8h8,or,8h9,cap,8ha,cup,8hb,int,8hk,there4,8hs,sim,8i5,cong,8i8,asymp,8j0,ne,8j1,equiv,8j4,le,8j5,ge,8k2,sub,8k3,sup,8k4,nsub,8k6,sube,8k7,supe,8kl,oplus,8kn,otimes,8l5,perp,8m5,sdot,8o8,lceil,8o9,rceil,8oa,lfloor,8ob,rfloor,8p9,lang,8pa,rang,9ea,loz,9j0,spades,9j3,clubs,9j5,hearts,9j6,diams,ai,OElig,aj,oelig,b0,Scaron,b1,scaron,bo,Yuml,m6,circ,ms,tilde,802,ensp,803,emsp,809,thinsp,80c,zwnj,80d,zwj,80e,lrm,80f,rlm,80j,ndash,80k,mdash,80o,lsquo,80p,rsquo,80q,sbquo,80s,ldquo,80t,rdquo,80u,bdquo,810,dagger,811,Dagger,81g,permil,81p,lsaquo,81q,rsaquo,85c,euro", 32), e2 = { strokeStyle: { svgAttr: "stroke", canvas: "#000000", svg: "none", apply: "stroke" }, fillStyle: { svgAttr: "fill", canvas: "#000000", svg: null, apply: "fill" }, lineCap: { svgAttr: "stroke-linecap", canvas: "butt", svg: "butt", apply: "stroke" }, lineJoin: { svgAttr: "stroke-linejoin", canvas: "miter", svg: "miter", apply: "stroke" }, miterLimit: { svgAttr: "stroke-miterlimit", canvas: 10, svg: 4, apply: "stroke" }, lineWidth: { svgAttr: "stroke-width", canvas: 1, svg: 1, apply: "stroke" }, globalAlpha: { svgAttr: "opacity", canvas: 1, svg: 1, apply: "fill stroke" }, font: { canvas: "10px sans-serif" }, shadowColor: { canvas: "#000000" }, shadowOffsetX: { canvas: 0 }, shadowOffsetY: { canvas: 0 }, shadowBlur: { canvas: 0 }, textAlign: { canvas: "start" }, textBaseline: { canvas: "alphabetic" }, lineDash: { svgAttr: "stroke-dasharray", canvas: [], svg: null, apply: "stroke" } }, (i = function(t2, e3) {
            this.__root = t2, this.__ctx = e3;
          }).prototype.addColorStop = function(t2, e3) {
            var r3, i2 = this.__ctx.__createElement("stop");
            i2.setAttribute("offset", t2), -1 !== e3.indexOf("rgba") ? (r3 = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi.exec(e3), i2.setAttribute("stop-color", s("rgb({r},{g},{b})", { r: r3[1], g: r3[2], b: r3[3] })), i2.setAttribute("stop-opacity", r3[4])) : i2.setAttribute("stop-color", e3), this.__root.appendChild(i2);
          }, n = function(t2, e3) {
            this.__root = t2, this.__ctx = e3;
          }, (r2 = function(t2) {
            var e3, i2 = { width: 500, height: 500, enableMirroring: false };
            if (arguments.length > 1 ? ((e3 = i2).width = arguments[0], e3.height = arguments[1]) : e3 = t2 || i2, !(this instanceof r2)) return new r2(e3);
            this.width = e3.width || i2.width, this.height = e3.height || i2.height, this.enableMirroring = void 0 !== e3.enableMirroring ? e3.enableMirroring : i2.enableMirroring, this.canvas = this, this.__document = e3.document || document, e3.ctx ? this.__ctx = e3.ctx : (this.__canvas = this.__document.createElement("canvas"), this.__ctx = this.__canvas.getContext("2d")), this.__setDefaultStyles(), this.__stack = [this.__getStyleState()], this.__groupStack = [], this.__root = this.__document.createElementNS("http://www.w3.org/2000/svg", "svg"), this.__root.setAttribute("version", 1.1), this.__root.setAttribute("xmlns", "http://www.w3.org/2000/svg"), this.__root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink"), this.__root.setAttribute("width", this.width), this.__root.setAttribute("height", this.height), this.__ids = {}, this.__defs = this.__document.createElementNS("http://www.w3.org/2000/svg", "defs"), this.__root.appendChild(this.__defs), this.__currentElement = this.__document.createElementNS("http://www.w3.org/2000/svg", "g"), this.__root.appendChild(this.__currentElement);
          }).prototype.__createElement = function(t2, e3, r3) {
            void 0 === e3 && (e3 = {});
            var i2, n2, o2 = this.__document.createElementNS("http://www.w3.org/2000/svg", t2), s2 = Object.keys(e3);
            for (r3 && (o2.setAttribute("fill", "none"), o2.setAttribute("stroke", "none")), i2 = 0; i2 < s2.length; i2++) n2 = s2[i2], o2.setAttribute(n2, e3[n2]);
            return o2;
          }, r2.prototype.__setDefaultStyles = function() {
            var t2, r3, i2 = Object.keys(e2);
            for (t2 = 0; t2 < i2.length; t2++) this[r3 = i2[t2]] = e2[r3].canvas;
          }, r2.prototype.__applyStyleState = function(t2) {
            if (t2) {
              var e3, r3, i2 = Object.keys(t2);
              for (e3 = 0; e3 < i2.length; e3++) this[r3 = i2[e3]] = t2[r3];
            }
          }, r2.prototype.__getStyleState = function() {
            var t2, r3, i2 = {}, n2 = Object.keys(e2);
            for (t2 = 0; t2 < n2.length; t2++) i2[r3 = n2[t2]] = this[r3];
            return i2;
          }, r2.prototype.__applyStyleToCurrentElement = function(t2) {
            var r3 = this.__currentElement;
            this.__currentElementsToStyle;
            var o2, a2, l2, h2, c, p = Object.keys(e2);
            for (o2 = 0; o2 < p.length; o2++) if (a2 = e2[p[o2]], l2 = this[p[o2]], a2.apply) {
              if (l2 instanceof n) {
                if (l2.__ctx) for (; l2.__ctx.__defs.childNodes.length; ) h2 = l2.__ctx.__defs.childNodes[0].getAttribute("id"), this.__ids[h2] = h2, this.__defs.appendChild(l2.__ctx.__defs.childNodes[0]);
                r3.setAttribute(a2.apply, s("url(#{id})", { id: l2.__root.getAttribute("id") }));
              } else if (l2 instanceof i) r3.setAttribute(a2.apply, s("url(#{id})", { id: l2.__root.getAttribute("id") }));
              else if (-1 !== a2.apply.indexOf(t2) && a2.svg !== l2) if ("stroke" !== a2.svgAttr && "fill" !== a2.svgAttr || -1 === l2.indexOf("rgba")) {
                var u = a2.svgAttr;
                if ("globalAlpha" === p[o2] && (u = t2 + "-" + a2.svgAttr, r3.getAttribute(u))) continue;
                r3.setAttribute(u, l2);
              } else {
                c = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d?\.?\d*)\s*\)/gi.exec(l2), r3.setAttribute(a2.svgAttr, s("rgb({r},{g},{b})", { r: c[1], g: c[2], b: c[3] }));
                var _ = c[4], d = this.globalAlpha;
                null != d && (_ *= d), r3.setAttribute(a2.svgAttr + "-opacity", _);
              }
            }
          }, r2.prototype.__closestGroupOrSvg = function(t2) {
            return "g" === (t2 = t2 || this.__currentElement).nodeName || "svg" === t2.nodeName ? t2 : this.__closestGroupOrSvg(t2.parentNode);
          }, r2.prototype.getSerializedSvg = function(t2) {
            var e3, r3, i2, n2, s2, a2 = new XMLSerializer().serializeToString(this.__root);
            if (/xmlns="http:\/\/www\.w3\.org\/2000\/svg".+xmlns="http:\/\/www\.w3\.org\/2000\/svg/gi.test(a2) && (a2 = a2.replace('xmlns="http://www.w3.org/2000/svg', 'xmlns:xlink="http://www.w3.org/1999/xlink')), t2) for (e3 = Object.keys(o), r3 = 0; r3 < e3.length; r3++) i2 = e3[r3], n2 = o[i2], (s2 = new RegExp(i2, "gi")).test(a2) && (a2 = a2.replace(s2, n2));
            return a2;
          }, r2.prototype.getSvg = function() {
            return this.__root;
          }, r2.prototype.save = function() {
            var t2 = this.__createElement("g"), e3 = this.__closestGroupOrSvg();
            this.__groupStack.push(e3), e3.appendChild(t2), this.__currentElement = t2, this.__stack.push(this.__getStyleState());
          }, r2.prototype.restore = function() {
            this.__currentElement = this.__groupStack.pop(), this.__currentElementsToStyle = null, this.__currentElement || (this.__currentElement = this.__root.childNodes[1]);
            var t2 = this.__stack.pop();
            this.__applyStyleState(t2);
          }, r2.prototype.__addTransform = function(t2) {
            var e3 = this.__closestGroupOrSvg();
            if (e3.childNodes.length > 0) {
              "path" === this.__currentElement.nodeName && (this.__currentElementsToStyle || (this.__currentElementsToStyle = { element: e3, children: [] }), this.__currentElementsToStyle.children.push(this.__currentElement), this.__applyCurrentDefaultPath());
              var r3 = this.__createElement("g");
              e3.appendChild(r3), this.__currentElement = r3;
            }
            var i2 = this.__currentElement.getAttribute("transform");
            i2 ? i2 += " " : i2 = "", i2 += t2, this.__currentElement.setAttribute("transform", i2);
          }, r2.prototype.scale = function(t2, e3) {
            void 0 === e3 && (e3 = t2), this.__addTransform(s("scale({x},{y})", { x: t2, y: e3 }));
          }, r2.prototype.rotate = function(t2) {
            var e3 = 180 * t2 / Math.PI;
            this.__addTransform(s("rotate({angle},{cx},{cy})", { angle: e3, cx: 0, cy: 0 }));
          }, r2.prototype.translate = function(t2, e3) {
            this.__addTransform(s("translate({x},{y})", { x: t2, y: e3 }));
          }, r2.prototype.transform = function(t2, e3, r3, i2, n2, o2) {
            this.__addTransform(s("matrix({a},{b},{c},{d},{e},{f})", { a: t2, b: e3, c: r3, d: i2, e: n2, f: o2 }));
          }, r2.prototype.beginPath = function() {
            var t2;
            this.__currentDefaultPath = "", this.__currentPosition = {}, t2 = this.__createElement("path", {}, true), this.__closestGroupOrSvg().appendChild(t2), this.__currentElement = t2;
          }, r2.prototype.__applyCurrentDefaultPath = function() {
            var t2 = this.__currentElement;
            "path" === t2.nodeName ? t2.setAttribute("d", this.__currentDefaultPath) : console.error("Attempted to apply path command to node", t2.nodeName);
          }, r2.prototype.__addPathCommand = function(t2) {
            this.__currentDefaultPath += " ", this.__currentDefaultPath += t2;
          }, r2.prototype.moveTo = function(t2, e3) {
            "path" !== this.__currentElement.nodeName && this.beginPath(), this.__currentPosition = { x: t2, y: e3 }, this.__addPathCommand(s("M {x} {y}", { x: t2, y: e3 }));
          }, r2.prototype.closePath = function() {
            this.__currentDefaultPath && this.__addPathCommand("Z");
          }, r2.prototype.lineTo = function(t2, e3) {
            this.__currentPosition = { x: t2, y: e3 }, this.__currentDefaultPath.indexOf("M") > -1 ? this.__addPathCommand(s("L {x} {y}", { x: t2, y: e3 })) : this.__addPathCommand(s("M {x} {y}", { x: t2, y: e3 }));
          }, r2.prototype.bezierCurveTo = function(t2, e3, r3, i2, n2, o2) {
            this.__currentPosition = { x: n2, y: o2 }, this.__addPathCommand(s("C {cp1x} {cp1y} {cp2x} {cp2y} {x} {y}", { cp1x: t2, cp1y: e3, cp2x: r3, cp2y: i2, x: n2, y: o2 }));
          }, r2.prototype.quadraticCurveTo = function(t2, e3, r3, i2) {
            this.__currentPosition = { x: r3, y: i2 }, this.__addPathCommand(s("Q {cpx} {cpy} {x} {y}", { cpx: t2, cpy: e3, x: r3, y: i2 }));
          };
          var h = function(t2) {
            var e3 = Math.sqrt(t2[0] * t2[0] + t2[1] * t2[1]);
            return [t2[0] / e3, t2[1] / e3];
          };
          r2.prototype.arcTo = function(t2, e3, r3, i2, n2) {
            var o2 = this.__currentPosition && this.__currentPosition.x, s2 = this.__currentPosition && this.__currentPosition.y;
            if (void 0 !== o2 && void 0 !== s2) {
              if (n2 < 0) throw new Error("IndexSizeError: The radius provided (" + n2 + ") is negative.");
              if (o2 === t2 && s2 === e3 || t2 === r3 && e3 === i2 || 0 === n2) this.lineTo(t2, e3);
              else {
                var a2 = h([o2 - t2, s2 - e3]), l2 = h([r3 - t2, i2 - e3]);
                if (a2[0] * l2[1] != a2[1] * l2[0]) {
                  var c = a2[0] * l2[0] + a2[1] * l2[1], p = Math.acos(Math.abs(c)), u = h([a2[0] + l2[0], a2[1] + l2[1]]), _ = n2 / Math.sin(p / 2), d = t2 + _ * u[0], f = e3 + _ * u[1], g = [-a2[1], a2[0]], m = [l2[1], -l2[0]], y = function(t3) {
                    var e4 = t3[0];
                    return t3[1] >= 0 ? Math.acos(e4) : -Math.acos(e4);
                  }, v = y(g), b = y(m);
                  this.lineTo(d + g[0] * n2, f + g[1] * n2), this.arc(d, f, n2, v, b);
                } else this.lineTo(t2, e3);
              }
            }
          }, r2.prototype.stroke = function() {
            "path" === this.__currentElement.nodeName && this.__currentElement.setAttribute("paint-order", "fill stroke markers"), this.__applyCurrentDefaultPath(), this.__applyStyleToCurrentElement("stroke");
          }, r2.prototype.fill = function() {
            "path" === this.__currentElement.nodeName && this.__currentElement.setAttribute("paint-order", "stroke fill markers"), this.__applyCurrentDefaultPath(), this.__applyStyleToCurrentElement("fill");
          }, r2.prototype.rect = function(t2, e3, r3, i2) {
            "path" !== this.__currentElement.nodeName && this.beginPath(), this.moveTo(t2, e3), this.lineTo(t2 + r3, e3), this.lineTo(t2 + r3, e3 + i2), this.lineTo(t2, e3 + i2), this.lineTo(t2, e3), this.closePath();
          }, r2.prototype.fillRect = function(t2, e3, r3, i2) {
            var n2;
            n2 = this.__createElement("rect", { x: t2, y: e3, width: r3, height: i2 }, true), this.__closestGroupOrSvg().appendChild(n2), this.__currentElement = n2, this.__applyStyleToCurrentElement("fill");
          }, r2.prototype.strokeRect = function(t2, e3, r3, i2) {
            var n2;
            n2 = this.__createElement("rect", { x: t2, y: e3, width: r3, height: i2 }, true), this.__closestGroupOrSvg().appendChild(n2), this.__currentElement = n2, this.__applyStyleToCurrentElement("stroke");
          }, r2.prototype.__clearCanvas = function() {
            for (var t2 = this.__closestGroupOrSvg().getAttribute("transform"), e3 = this.__root.childNodes[1], r3 = e3.childNodes, i2 = r3.length - 1; i2 >= 0; i2--) r3[i2] && e3.removeChild(r3[i2]);
            this.__currentElement = e3, this.__groupStack = [], t2 && this.__addTransform(t2);
          }, r2.prototype.clearRect = function(t2, e3, r3, i2) {
            if (0 !== t2 || 0 !== e3 || r3 !== this.width || i2 !== this.height) {
              var n2, o2 = this.__closestGroupOrSvg();
              n2 = this.__createElement("rect", { x: t2, y: e3, width: r3, height: i2, fill: "#FFFFFF" }, true), o2.appendChild(n2);
            } else this.__clearCanvas();
          }, r2.prototype.createLinearGradient = function(t2, e3, r3, n2) {
            var o2 = this.__createElement("linearGradient", { id: a(this.__ids), x1: t2 + "px", x2: r3 + "px", y1: e3 + "px", y2: n2 + "px", gradientUnits: "userSpaceOnUse" }, false);
            return this.__defs.appendChild(o2), new i(o2, this);
          }, r2.prototype.createRadialGradient = function(t2, e3, r3, n2, o2, s2) {
            var l2 = this.__createElement("radialGradient", { id: a(this.__ids), cx: n2 + "px", cy: o2 + "px", r: s2 + "px", fx: t2 + "px", fy: e3 + "px", gradientUnits: "userSpaceOnUse" }, false);
            return this.__defs.appendChild(l2), new i(l2, this);
          }, r2.prototype.__parseFont = function() {
            var t2 = /^\s*(?=(?:(?:[-a-z]+\s*){0,2}(italic|oblique))?)(?=(?:(?:[-a-z]+\s*){0,2}(small-caps))?)(?=(?:(?:[-a-z]+\s*){0,2}(bold(?:er)?|lighter|[1-9]00))?)(?:(?:normal|\1|\2|\3)\s*){0,3}((?:xx?-)?(?:small|large)|medium|smaller|larger|[.\d]+(?:\%|in|[cem]m|ex|p[ctx]))(?:\s*\/\s*(normal|[.\d]+(?:\%|in|[cem]m|ex|p[ctx])))?\s*([-,\'\"\sa-z0-9]+?)\s*$/i.exec(this.font), e3 = { style: t2[1] || "normal", size: t2[4] || "10px", family: t2[6] || "sans-serif", weight: t2[3] || "normal", decoration: t2[2] || "normal", href: null };
            return "underline" === this.__fontUnderline && (e3.decoration = "underline"), this.__fontHref && (e3.href = this.__fontHref), e3;
          }, r2.prototype.__wrapTextLink = function(t2, e3) {
            if (t2.href) {
              var r3 = this.__createElement("a");
              return r3.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", t2.href), r3.appendChild(e3), r3;
            }
            return e3;
          }, r2.prototype.__applyText = function(t2, e3, r3, i2) {
            var n2, o2, s2 = this.__parseFont(), a2 = this.__closestGroupOrSvg(), h2 = this.__createElement("text", { "font-family": s2.family, "font-size": s2.size, "font-style": s2.style, "font-weight": s2.weight, "text-decoration": s2.decoration, x: e3, y: r3, "text-anchor": (n2 = this.textAlign, o2 = { left: "start", right: "end", center: "middle", start: "start", end: "end" }, o2[n2] || o2.start), "dominant-baseline": l(this.textBaseline) }, true);
            h2.appendChild(this.__document.createTextNode(t2)), this.__currentElement = h2, this.__applyStyleToCurrentElement(i2), a2.appendChild(this.__wrapTextLink(s2, h2));
          }, r2.prototype.fillText = function(t2, e3, r3) {
            this.__applyText(t2, e3, r3, "fill");
          }, r2.prototype.strokeText = function(t2, e3, r3) {
            this.__applyText(t2, e3, r3, "stroke");
          }, r2.prototype.measureText = function(t2) {
            return this.__ctx.font = this.font, this.__ctx.measureText(t2);
          }, r2.prototype.arc = function(t2, e3, r3, i2, n2, o2) {
            if (i2 !== n2) {
              (i2 %= 2 * Math.PI) === (n2 %= 2 * Math.PI) && (n2 = (n2 + 2 * Math.PI - 1e-3 * (o2 ? -1 : 1)) % (2 * Math.PI));
              var a2 = t2 + r3 * Math.cos(n2), l2 = e3 + r3 * Math.sin(n2), h2 = t2 + r3 * Math.cos(i2), c = e3 + r3 * Math.sin(i2), p = o2 ? 0 : 1, u = 0, _ = n2 - i2;
              _ < 0 && (_ += 2 * Math.PI), u = o2 ? _ > Math.PI ? 0 : 1 : _ > Math.PI ? 1 : 0, this.lineTo(h2, c), this.__addPathCommand(s("A {rx} {ry} {xAxisRotation} {largeArcFlag} {sweepFlag} {endX} {endY}", { rx: r3, ry: r3, xAxisRotation: 0, largeArcFlag: u, sweepFlag: p, endX: a2, endY: l2 })), this.__currentPosition = { x: a2, y: l2 };
            }
          }, r2.prototype.clip = function() {
            var t2 = this.__closestGroupOrSvg(), e3 = this.__createElement("clipPath"), r3 = a(this.__ids), i2 = this.__createElement("g");
            this.__applyCurrentDefaultPath(), t2.removeChild(this.__currentElement), e3.setAttribute("id", r3), e3.appendChild(this.__currentElement), this.__defs.appendChild(e3), t2.setAttribute("clip-path", s("url(#{id})", { id: r3 })), t2.appendChild(i2), this.__currentElement = i2;
          }, r2.prototype.drawImage = function() {
            var t2, e3, i2, n2, o2, s2, a2, l2, h2, c, p, u, _, d = Array.prototype.slice.call(arguments), f = d[0], g = 0, m = 0;
            if (3 === d.length) t2 = d[1], e3 = d[2], i2 = o2 = f.width, n2 = s2 = f.height;
            else if (5 === d.length) t2 = d[1], e3 = d[2], i2 = d[3], n2 = d[4], o2 = f.width, s2 = f.height;
            else {
              if (9 !== d.length) throw new Error("Inavlid number of arguments passed to drawImage: " + arguments.length);
              g = d[1], m = d[2], o2 = d[3], s2 = d[4], t2 = d[5], e3 = d[6], i2 = d[7], n2 = d[8];
            }
            a2 = this.__closestGroupOrSvg(), this.__currentElement;
            var y = "translate(" + t2 + ", " + e3 + ")";
            if (f instanceof r2) {
              if ((l2 = f.getSvg().cloneNode(true)).childNodes && l2.childNodes.length > 1) {
                for (h2 = l2.childNodes[0]; h2.childNodes.length; ) _ = h2.childNodes[0].getAttribute("id"), this.__ids[_] = _, this.__defs.appendChild(h2.childNodes[0]);
                if (c = l2.childNodes[1]) {
                  var v, b = c.getAttribute("transform");
                  v = b ? b + " " + y : y, c.setAttribute("transform", v), a2.appendChild(c);
                }
              }
            } else "CANVAS" !== f.nodeName && "IMG" !== f.nodeName || ((p = this.__createElement("image")).setAttribute("width", i2), p.setAttribute("height", n2), p.setAttribute("opacity", this.globalAlpha), p.setAttribute("preserveAspectRatio", "none"), (u = this.__document.createElement("canvas")).width = i2, u.height = n2, u.getContext("2d").drawImage(f, g, m, o2, s2, 0, 0, i2, n2), f = u, p.setAttribute("transform", y), p.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "CANVAS" === f.nodeName ? f.toDataURL() : f.getAttribute("src")), a2.appendChild(p));
          }, r2.prototype.createPattern = function(t2, e3) {
            var i2, o2 = this.__document.createElementNS("http://www.w3.org/2000/svg", "pattern"), s2 = a(this.__ids);
            return o2.setAttribute("id", s2), o2.setAttribute("width", t2.width), o2.setAttribute("height", t2.height), "CANVAS" === t2.nodeName || "IMG" === t2.nodeName ? ((i2 = this.__document.createElementNS("http://www.w3.org/2000/svg", "image")).setAttribute("width", t2.width), i2.setAttribute("height", t2.height), i2.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "CANVAS" === t2.nodeName ? t2.toDataURL() : t2.getAttribute("src")), o2.appendChild(i2), this.__defs.appendChild(o2)) : t2 instanceof r2 && (o2.appendChild(t2.__root.childNodes[1]), this.__defs.appendChild(o2)), new n(o2, this);
          }, r2.prototype.setLineDash = function(t2) {
            t2 && t2.length > 0 ? this.lineDash = t2.join(",") : this.lineDash = null;
          }, r2.prototype.drawFocusRing = function() {
          }, r2.prototype.createImageData = function() {
          }, r2.prototype.getImageData = function() {
          }, r2.prototype.putImageData = function() {
          }, r2.prototype.globalCompositeOperation = function() {
          }, r2.prototype.setTransform = function() {
          }, "object" == typeof window && (window.C2S = r2), "object" == typeof t.exports && (t.exports = r2);
        }();
      }]);
    });
  }
});
export default require_cytoscape_svg();
//# sourceMappingURL=cytoscape-svg.js.map
