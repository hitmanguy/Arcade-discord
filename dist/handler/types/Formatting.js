"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Format = exports.BackgroundColor = exports.Color = void 0;
var Color;
(function (Color) {
    Color["Gray"] = "30";
    Color["Red"] = "31";
    Color["Green"] = "32";
    Color["Yellow"] = "33";
    Color["Blue"] = "34";
    Color["Pink"] = "35";
    Color["Cyan"] = "36";
    Color["White"] = "37";
})(Color || (exports.Color = Color = {}));
var BackgroundColor;
(function (BackgroundColor) {
    BackgroundColor["DarkBlue"] = "40";
    BackgroundColor["Orange"] = "41";
    BackgroundColor["MarbleBlue"] = "42";
    BackgroundColor["GrayTurquoise"] = "43";
    BackgroundColor["Gray"] = "44";
    BackgroundColor["Indigo"] = "45";
    BackgroundColor["LightGray"] = "46";
    BackgroundColor["White"] = "47";
    BackgroundColor["None"] = "";
})(BackgroundColor || (exports.BackgroundColor = BackgroundColor = {}));
var Format;
(function (Format) {
    Format["Normal"] = "0";
    Format["Bold"] = "1";
    Format["Underline"] = "4";
})(Format || (exports.Format = Format = {}));
//# sourceMappingURL=Formatting.js.map