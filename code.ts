import "../node_modules/figma-plugin-ds/dist/figma-plugin-ds.css";
import "./ui.css";
import * as amplitude from "@amplitude/analytics-browser";
import { Identify } from "@amplitude/analytics-browser";
import rough from "roughjs";
amplitude.init("94797d7f76006e6510b76260b52b40d0");
/*******************
 * SESSION VARIABLES
 *******************/
function hslToHex(h, s, l) {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color)
            .toString(16)
            .padStart(2, "0") // convert to Hex and prefix "0" if needed
            .toUpperCase();
    };
    return `${f(0)}${f(8)}${f(4)}`;
}
const getDefaultFillColor = () => hslToHex(Math.random() * 360, 100, 70);
let defaultFillColor = "";
let defaultStrokeColor = "000000";
let svg = document.createElement("svg");
let rc = rough.svg(svg);
const hexToRGB255 = (hex) => ({
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
});
document.getElementById("nux-continue").onclick = () => hidePaidAnnouncement();
// document.getElementById("tutorial-text").onclick = () => tutorialStepper(0);
// document.getElementById("tutorial-step-1").onclick = () => tutorialStepper(1);
// document.getElementById("tutorial-step-2").onclick = () => tutorialStepper(2);
document.getElementById("upgrade-text").onclick = () => launchCheckout(); //openLicenseKeyPage();
// document.getElementById("activate-license-key-button").onclick = () => {
//     const licenseKey = (<HTMLInputElement>document.getElementById("license-key-input")).value;
//     if (licenseKey.length) {
//         parent.postMessage({ pluginMessage: { type: "validateLicenseKey", licenseKey }, pluginId: "733902567457592893" }, "https://www.figma.com");
//     } else {
//         document.getElementById("empty-license-key-error-text").setAttribute("style", "display: block");
//     }
// };
// document.getElementById("license-key-back-button").onclick = () => backLicenseKeyPage();
// document.getElementById("license-key-input").oninput = () => onLicenseKeyInputChange();
document.getElementById("create-shape-button").onclick = () => {
    const shape = document.getElementById("shapes-screen-svg").children[0];
    const [stroke, fill] = [shape.children[0], shape.children[1]];
    const dFill = fill.getAttribute("d");
    const dStroke = stroke.getAttribute("d");
    parent.postMessage({
        pluginMessage: { type: "createShape", fillPath: dFill, strokePath: dStroke },
        pluginId: "733902567457592893",
    }, "https://www.figma.com");
    amplitude.track("DRAW_SHAPE_CLICKED");
};
/******************************** */
/*** TOP "FLOWS" - "SHAPES" NAV ***/
/******************************** */
const flowsNavItem = document.getElementById("flows-nav-item");
const switchToFlowsUI = (userPaidStatus) => {
    if (!flowsNavItem.classList.contains("nav-item-selected")) {
        flowsNavItem.classList.add("nav-item-selected");
        document.getElementById("shapes-nav-item").classList.remove("nav-item-selected");
        document.getElementById("flows-ui").classList.remove("hide");
        document.getElementById("shapes-ui").classList.add("hide");
        userPaidStatus ? document.getElementById("footer").classList.add("hide") : document.getElementById("footer").classList.remove("hide");
        parent.postMessage({ pluginMessage: { type: "resizeUI", value: { width: 240, height: userPaidStatus ? 365 : 401 } }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
};
flowsNavItem.onclick = () => {
    parent.postMessage({ pluginMessage: { type: "getFlowsUIHeight" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("TAB_FLOWS_CLICKED");
};
const shapesNavItem = document.getElementById("shapes-nav-item");
const switchToShapesUI = () => {
    if (!shapesNavItem.classList.contains("nav-item-selected")) {
        flowsNavItem.classList.remove("nav-item-selected");
        shapesNavItem.classList.add("nav-item-selected");
        document.getElementById("flows-ui").classList.add("hide");
        document.getElementById("shapes-ui").classList.remove("hide");
        document.getElementById("footer").classList.add("hide");
        //(<HTMLInputElement>document.getElementById("text-in-shape")).focus();
        parent.postMessage({ pluginMessage: { type: "resizeUI", value: { width: 240, height: 623 } }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
};
shapesNavItem.onclick = () => {
    switchToShapesUI();
    amplitude.track("TAB_SHAPES_CLICKED");
};
const connectorsNavItem = document.getElementById("connectors-nav-item");
connectorsNavItem.onclick = () => {
    amplitude.track("TAB_CONNECTORS_CLICKED");
};
/* Geometry */
const radioStraight = document.getElementById("radio-geometry-straight");
const radioBezier = document.getElementById("radio-geometry-bezier");
const radioRightAngle = document.getElementById("radio-geometry-right-angle");
// radioStraight.onclick = () => {
//     if (!radioStraight.classList.contains("homemade-radio-selected")) {
//         radioStraight.classList.add("homemade-radio-selected");
//         radioBezier.classList.remove("homemade-radio-selected");
//         radioRightAngle.classList.remove("homemade-radio-selected");
//         parent.postMessage({ pluginMessage: { type: "geometry", value: "STRAIGHT" }, pluginId: "733902567457592893" }, "https://www.figma.com");
//     }
// };
radioBezier.onclick = () => {
    if (!radioBezier.classList.contains("homemade-radio-selected")) {
        radioStraight.classList.remove("homemade-radio-selected");
        radioBezier.classList.add("homemade-radio-selected");
        radioRightAngle.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "geometry", value: "BEZIER" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_GEOMETRY_CLICKED", { type: "BEZIER" });
};
radioRightAngle.onclick = () => {
    if (!radioRightAngle.classList.contains("homemade-radio-selected")) {
        radioStraight.classList.remove("homemade-radio-selected");
        radioBezier.classList.remove("homemade-radio-selected");
        radioRightAngle.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "geometry", value: "RIGHT_ANGLE" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_GEOMETRY_CLICKED", { type: "RIGHT_ANGLE" });
};
/* Sketchiness */
const radioSmooth = document.getElementById("radio-smooth");
const radioSketchy = document.getElementById("radio-sketchy");
radioSmooth.onclick = () => {
    if (!radioSmooth.classList.contains("homemade-radio-selected")) {
        radioSmooth.classList.add("homemade-radio-selected");
        radioSketchy.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "rough", value: null }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_SKETCHY_CLICKED", { type: "SMOOTH" });
};
radioSketchy.onclick = () => {
    if (!radioSketchy.classList.contains("homemade-radio-selected")) {
        radioSmooth.classList.remove("homemade-radio-selected");
        radioSketchy.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "rough", value: {} }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_SKETCHY_CLICKED", { type: "SKETCHY" });
};
/************************** */
/*** SHAPE STYLE SETTINGS ***/
/************************** */
/* Shape */
const radioRectangle = document.getElementById("radio-shape-rectangle");
const radioCircle = document.getElementById("radio-shape-circle");
const radioDiamond = document.getElementById("radio-shape-diamond");
radioRectangle.onclick = () => {
    if (!radioRectangle.classList.contains("homemade-radio-selected")) {
        radioRectangle.classList.add("homemade-radio-selected");
        radioCircle.classList.remove("homemade-radio-selected");
        radioDiamond.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "shape", value: "RECTANGLE" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_SHAPE_CLICKED", { shape: "RECTANGLE" });
};
radioCircle.onclick = () => {
    if (!radioCircle.classList.contains("homemade-radio-selected")) {
        radioRectangle.classList.remove("homemade-radio-selected");
        radioCircle.classList.add("homemade-radio-selected");
        radioDiamond.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "shape", value: "CIRCLE" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_SHAPE_CLICKED", { shape: "CIRCLE" });
};
// radioDiamond.onclick = () => {
//     if (!radioDiamond.classList.contains("homemade-radio-selected")) {
//         radioRectangle.classList.remove("homemade-radio-selected");
//         radioCircle.classList.remove("homemade-radio-selected");
//         radioDiamond.classList.add("homemade-radio-selected");
//         parent.postMessage({ pluginMessage: { type: "shape", style: "shape", value: "DIAMOND" }, pluginId: "733902567457592893" }, "https://www.figma.com");
//     }
// };
/* Stroke */
document.getElementById("color-picker-shapes-stroke").addEventListener("blur", colorPickerShapesStroke);
document.getElementById("color-picker-shapes-stroke").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
function colorPickerShapesStroke(event) {
    let value = event.target.value;
    const swatch = document.getElementById("color-swatch-shapes-stroke");
    const colorPicker = document.getElementById("color-picker-shapes-stroke");
    const textInShapeInput = document.getElementById("text-in-shape");
    if (value.match(/^#?([A-Fa-f0-9]+)$/g)) {
        value = value[0] === "#" ? value.slice(1) : value;
        value = (value.length < 6 ? value.repeat(6) : value).slice(0, 6).toUpperCase();
        swatch.style.background = `#${value}`;
        colorPicker.value = value;
        textInShapeInput.style.borderColor = `#${value}`;
        defaultStrokeColor = value;
        if (colorPicker.getAttribute("initial-value") !== value) {
            parent.postMessage({ pluginMessage: { type: "shape", style: "stroke", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
            amplitude.track("SHAPE_STROKE_COLOR_CHANGED", { color: value });
        }
        colorPicker.setAttribute("initial-value", value);
    }
    else {
        colorPicker.value = colorPicker.getAttribute("initial-value");
    }
}
/* ADD OR REMOVE FILL */
document.getElementById("shapes-stroke-minus-button").onclick = () => {
    shapesStrokeToNone();
    parent.postMessage({ pluginMessage: { type: "shape", style: "stroke", value: "none" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("REMOVE_SHAPE_STROKE");
};
const shapesStrokeToNone = () => {
    document.getElementById("shapes-stroke-minus-button").classList.add("hide");
    document.getElementById("shapes-stroke-plus-button").classList.remove("hide");
    const [swatch, picker] = [document.getElementById("color-swatch-shapes-stroke"), document.getElementById("color-picker-shapes-stroke")];
    swatch.classList.add("icon--homemade-transparent-bg");
    swatch.style.background = "";
    picker.value = "None";
    picker.disabled = true;
    picker.style.pointerEvents = "none";
};
document.getElementById("shapes-stroke-plus-button").onclick = () => {
    shapesStrokeToColor();
    parent.postMessage({ pluginMessage: { type: "shape", style: "stroke", value: defaultStrokeColor }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("ADD_SHAPE_STROKE");
};
const shapesStrokeToColor = (color = undefined) => {
    document.getElementById("shapes-stroke-minus-button").classList.remove("hide");
    document.getElementById("shapes-stroke-plus-button").classList.add("hide");
    const [swatch, picker] = [document.getElementById("color-swatch-shapes-stroke"), document.getElementById("color-picker-shapes-stroke")];
    swatch.classList.remove("icon--homemade-transparent-bg");
    swatch.style.background = color ? `#${color}` : `#${defaultStrokeColor}`;
    picker.setAttribute("initial-value", color || defaultStrokeColor);
    picker.value = color || defaultStrokeColor;
    picker.disabled = false;
    picker.style.pointerEvents = "auto";
};
document.getElementById("color-picker-shapes-fill").addEventListener("blur", colorPickerShapesFill);
document.getElementById("color-picker-shapes-fill").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
function colorPickerShapesFill(event) {
    let value = event.target.value;
    const swatch = document.getElementById("color-swatch-shapes-fill");
    const colorPicker = document.getElementById("color-picker-shapes-fill");
    if (value.match(/^#?([A-Fa-f0-9]+)$/g)) {
        value = value[0] === "#" ? value.slice(1) : value;
        value = (value.length < 6 ? value.repeat(6) : value).slice(0, 6).toUpperCase();
        swatch.style.background = `#${value}`;
        colorPicker.value = value;
        defaultFillColor = value;
        if (colorPicker.getAttribute("initial-value") !== value) {
            parent.postMessage({ pluginMessage: { type: "shape", style: "fill", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
            amplitude.track("SHAPE_FILL_COLOR_CHANGED", { color: value });
        }
        colorPicker.setAttribute("initial-value", value);
    }
    else {
        colorPicker.value = colorPicker.getAttribute("initial-value");
    }
}
/* ADD OR REMOVE FILL */
document.getElementById("shapes-fill-minus-button").onclick = () => {
    shapeFillToNone();
    parent.postMessage({ pluginMessage: { type: "shape", style: "fill", value: "none" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("REMOVE_SHAPE_FILL");
};
const shapeFillToNone = () => {
    document.getElementById("shapes-fill-minus-button").classList.add("hide");
    document.getElementById("shapes-fill-plus-button").classList.remove("hide");
    const [swatch, picker] = [document.getElementById("color-swatch-shapes-fill"), document.getElementById("color-picker-shapes-fill")];
    swatch.classList.add("icon--homemade-transparent-bg");
    swatch.style.background = "";
    picker.value = "None";
    picker.disabled = true;
    picker.style.pointerEvents = "none";
};
document.getElementById("shapes-fill-plus-button").onclick = () => {
    const color = defaultFillColor || getDefaultFillColor();
    shapeFillToColor(color);
    parent.postMessage({ pluginMessage: { type: "shape", style: "fill", value: color }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("ADD_SHAPE_FILL");
};
const shapeFillToColor = (color = undefined) => {
    document.getElementById("shapes-fill-minus-button").classList.remove("hide");
    document.getElementById("shapes-fill-plus-button").classList.add("hide");
    const [swatch, picker] = [document.getElementById("color-swatch-shapes-fill"), document.getElementById("color-picker-shapes-fill")];
    swatch.classList.remove("icon--homemade-transparent-bg");
    swatch.style.background = `#${color}`;
    picker.setAttribute("initial-value", color);
    picker.value = color;
    picker.disabled = false;
    picker.style.pointerEvents = "auto";
};
/* Dash */
const radioDashSolid = document.getElementById("radio-dash-solid");
const radioDashDashed = document.getElementById("radio-dash-dashed");
const radioDashDotted = document.getElementById("radio-dash-dotted");
const textInShapeInput = document.getElementById("text-in-shape");
radioDashSolid.onclick = () => {
    if (!radioDashSolid.classList.contains("homemade-radio-selected")) {
        radioDashSolid.classList.add("homemade-radio-selected");
        radioDashDashed.classList.remove("homemade-radio-selected");
        radioDashDotted.classList.remove("homemade-radio-selected");
        textInShapeInput.style.borderStyle = "solid";
        parent.postMessage({ pluginMessage: { type: "shape", style: "dash", value: "SOLID" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_DASH_CLICKED", { dash: "SOLID" });
};
radioDashDashed.onclick = () => {
    if (!radioDashDashed.classList.contains("homemade-radio-selected")) {
        radioDashSolid.classList.remove("homemade-radio-selected");
        radioDashDashed.classList.add("homemade-radio-selected");
        radioDashDotted.classList.remove("homemade-radio-selected");
        textInShapeInput.style.borderStyle = "dashed";
        parent.postMessage({ pluginMessage: { type: "shape", style: "dash", value: "DASHED" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_DASH_CLICKED", { dash: "DASHED" });
};
radioDashDotted.onclick = () => {
    if (!radioDashDotted.classList.contains("homemade-radio-selected")) {
        radioDashSolid.classList.remove("homemade-radio-selected");
        radioDashDashed.classList.remove("homemade-radio-selected");
        radioDashDotted.classList.add("homemade-radio-selected");
        textInShapeInput.style.borderStyle = "dotted";
        parent.postMessage({ pluginMessage: { type: "shape", style: "dash", value: "DOTTED" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_DASH_CLICKED", { dash: "DOTTED" });
};
/* Weight */
const radioWeight1 = document.getElementById("radio-weight-1");
const radioWeight2 = document.getElementById("radio-weight-2");
const radioWeight3 = document.getElementById("radio-weight-3");
radioWeight1.onclick = () => {
    if (!radioWeight1.classList.contains("homemade-radio-selected")) {
        radioWeight1.classList.add("homemade-radio-selected");
        radioWeight2.classList.remove("homemade-radio-selected");
        radioWeight3.classList.remove("homemade-radio-selected");
        textInShapeInput.style.borderWidth = "1.5px";
        parent.postMessage({ pluginMessage: { type: "shape", style: "weight", value: 1 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_WEIGHT_CLICKED", { weight: 1 });
};
radioWeight2.onclick = () => {
    if (!radioWeight2.classList.contains("homemade-radio-selected")) {
        radioWeight1.classList.remove("homemade-radio-selected");
        radioWeight2.classList.add("homemade-radio-selected");
        radioWeight3.classList.remove("homemade-radio-selected");
        textInShapeInput.style.borderWidth = "2px";
        parent.postMessage({ pluginMessage: { type: "shape", style: "weight", value: 2 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_WEIGHT_CLICKED", { weight: 2 });
};
radioWeight3.onclick = () => {
    if (!radioWeight3.classList.contains("homemade-radio-selected")) {
        radioWeight1.classList.remove("homemade-radio-selected");
        radioWeight2.classList.remove("homemade-radio-selected");
        radioWeight3.classList.add("homemade-radio-selected");
        textInShapeInput.style.borderWidth = "3px";
        parent.postMessage({ pluginMessage: { type: "shape", style: "weight", value: 3 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_WEIGHT_CLICKED", { weight: 3 });
};
/* Hachure */
const hatchingHachure = document.getElementById("radio-hatching-1");
const hatchingCrossHatch = document.getElementById("radio-hatching-2");
const hatchingSolid = document.getElementById("radio-hatching-3");
hatchingHachure.onclick = () => {
    if (!hatchingHachure.classList.contains("homemade-radio-selected")) {
        hatchingHachure.classList.add("homemade-radio-selected");
        hatchingCrossHatch.classList.remove("homemade-radio-selected");
        hatchingSolid.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "hachure", value: "hachure" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_HATCHING_CLICKED", { hachure: "hachure" });
};
hatchingCrossHatch.onclick = () => {
    if (!hatchingCrossHatch.classList.contains("homemade-radio-selected")) {
        hatchingHachure.classList.remove("homemade-radio-selected");
        hatchingCrossHatch.classList.add("homemade-radio-selected");
        hatchingSolid.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "hachure", value: "cross-hatch" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_HATCHING_CLICKED", { hachure: "cross-hatch" });
};
hatchingSolid.onclick = () => {
    if (!hatchingSolid.classList.contains("homemade-radio-selected")) {
        hatchingHachure.classList.remove("homemade-radio-selected");
        hatchingCrossHatch.classList.remove("homemade-radio-selected");
        hatchingSolid.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "hachure", value: "solid" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_HATCHING_CLICKED", { hachure: "solid" });
};
/* Roughness */
const roughness1 = document.getElementById("radio-roughness-1");
const roughness2 = document.getElementById("radio-roughness-2");
const roughness3 = document.getElementById("radio-roughness-3");
roughness1.onclick = () => {
    if (!roughness1.classList.contains("homemade-radio-selected")) {
        roughness1.classList.add("homemade-radio-selected");
        roughness2.classList.remove("homemade-radio-selected");
        roughness3.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "roughness", value: 0 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_ROUGHNESS_CLICKED", { roughness: 0 });
};
roughness2.onclick = () => {
    if (!roughness2.classList.contains("homemade-radio-selected")) {
        roughness1.classList.remove("homemade-radio-selected");
        roughness2.classList.add("homemade-radio-selected");
        roughness3.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "roughness", value: 0.5 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_ROUGHNESS_CLICKED", { roughness: 0.5 });
};
roughness3.onclick = () => {
    if (!roughness3.classList.contains("homemade-radio-selected")) {
        roughness1.classList.remove("homemade-radio-selected");
        roughness2.classList.remove("homemade-radio-selected");
        roughness3.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "roughness", value: 2 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_ROUGHNESS_CLICKED", { roughness: 2 });
};
/* Font family */
const fontFamilyGloria = document.getElementById("radio-gloria");
const fontFamilyInter = document.getElementById("radio-inter");
const fontFamilyCourier = document.getElementById("radio-courier");
fontFamilyGloria.onclick = () => {
    if (!fontFamilyGloria.classList.contains("homemade-radio-selected")) {
        fontFamilyGloria.classList.add("homemade-radio-selected");
        fontFamilyInter.classList.remove("homemade-radio-selected");
        fontFamilyCourier.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "fontFamily", value: "Gloria Hallelujah" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_FONT_FAMILY_CLICKED", { fontFamily: "Gloria Hallelujah" });
};
fontFamilyInter.onclick = () => {
    if (!fontFamilyInter.classList.contains("homemade-radio-selected")) {
        fontFamilyGloria.classList.remove("homemade-radio-selected");
        fontFamilyInter.classList.add("homemade-radio-selected");
        fontFamilyCourier.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "fontFamily", value: "Inter" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_FONT_FAMILY_CLICKED", { fontFamily: "Inter" });
};
fontFamilyCourier.onclick = () => {
    if (!fontFamilyCourier.classList.contains("homemade-radio-selected")) {
        fontFamilyGloria.classList.remove("homemade-radio-selected");
        fontFamilyInter.classList.remove("homemade-radio-selected");
        fontFamilyCourier.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "fontFamily", value: "Courier" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_FONT_FAMILY_CLICKED", { fontFamily: "Courier" });
};
/* Font size */
const fontSize1 = document.getElementById("radio-font-size-1");
const fontSize2 = document.getElementById("radio-font-size-2");
const fontSize3 = document.getElementById("radio-font-size-3");
fontSize1.onclick = () => {
    if (!fontSize1.classList.contains("homemade-radio-selected")) {
        fontSize1.classList.add("homemade-radio-selected");
        fontSize2.classList.remove("homemade-radio-selected");
        fontSize3.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "fontSize", value: 12 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_FONT_SIZE_CLICKED", { fontSize: 12 });
};
fontSize2.onclick = () => {
    if (!fontSize2.classList.contains("homemade-radio-selected")) {
        fontSize1.classList.remove("homemade-radio-selected");
        fontSize2.classList.add("homemade-radio-selected");
        fontSize3.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "fontSize", value: 18 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_FONT_SIZE_CLICKED", { fontSize: 18 });
};
fontSize3.onclick = () => {
    if (!fontSize3.classList.contains("homemade-radio-selected")) {
        fontSize1.classList.remove("homemade-radio-selected");
        fontSize2.classList.remove("homemade-radio-selected");
        fontSize3.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "fontSize", value: 30 }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_FONT_SIZE_CLICKED", { fontSize: 30 });
};
/* Text align */
const textAlignLeft = document.getElementById("radio-text-align-left");
const textAlignCenter = document.getElementById("radio-text-align-center");
const textAlignRight = document.getElementById("radio-text-align-right");
textAlignLeft.onclick = () => {
    if (!textAlignLeft.classList.contains("homemade-radio-selected")) {
        textAlignLeft.classList.add("homemade-radio-selected");
        textAlignCenter.classList.remove("homemade-radio-selected");
        textAlignRight.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "textAlign", value: "LEFT" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_TEXT_ALIGN_CLICKED", { textAlign: "LEFT" });
};
textAlignCenter.onclick = () => {
    if (!textAlignCenter.classList.contains("homemade-radio-selected")) {
        textAlignLeft.classList.remove("homemade-radio-selected");
        textAlignCenter.classList.add("homemade-radio-selected");
        textAlignRight.classList.remove("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "textAlign", value: "CENTER" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_TEXT_ALIGN_CLICKED", { textAlign: "CENTER" });
};
textAlignRight.onclick = () => {
    if (!textAlignRight.classList.contains("homemade-radio-selected")) {
        textAlignLeft.classList.remove("homemade-radio-selected");
        textAlignCenter.classList.remove("homemade-radio-selected");
        textAlignRight.classList.add("homemade-radio-selected");
        parent.postMessage({ pluginMessage: { type: "shape", style: "textAlign", value: "RIGHT" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    amplitude.track("RADIO_TEXT_ALIGN_CLICKED", { textAlign: "RIGHT" });
};
/***************** */
/*** FLOW STYLES ***/
/***************** */
document.getElementById("color-picker-flows").addEventListener("blur", colorPickerFlows);
document.getElementById("stroke-opacity").addEventListener("blur", strokeOpacity);
document.getElementById("stroke-weight").addEventListener("blur", strokeWeight);
document.getElementById("corner-radius").addEventListener("blur", cornerRadius);
document.getElementById("dash-pattern").addEventListener("blur", dashPattern);
document.getElementById("offset-src").addEventListener("blur", offsetStart);
document.getElementById("offset-dst").addEventListener("blur", offsetEnd);
document.getElementById("color-picker-flows").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
document.getElementById("stroke-opacity").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
document.getElementById("stroke-weight").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
document.getElementById("corner-radius").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
document.getElementById("dash-pattern").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
document.getElementById("offset-src").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
document.getElementById("offset-dst").addEventListener("keydown", function (e) {
    if (e.key === "Enter")
        this.blur();
});
/*** TEXT ON PATH ***/
let textInput = document.getElementById("text-on-path");
textInput.addEventListener("keyup", function (e) {
    if (e.key === "Enter")
        this.blur();
    else
        parent.postMessage({ pluginMessage: { type: "text", text: textInput.value }, pluginId: "733902567457592893" }, "https://www.figma.com");
});
/*** TEXT IN SHAPE ***/
textInShapeInput.addEventListener("keyup", function (e) {
    if (e.key === "Enter")
        this.blur();
    else
        parent.postMessage({ pluginMessage: { type: "textInShape", text: textInShapeInput.value }, pluginId: "733902567457592893" }, "https://www.figma.com");
});
/*** TUTORIAL ***/
// document.getElementById("tutorial-text").addEventListener("click", function () {
//     amplitude.track("IN_APP_TUTORIAL_CLICKED");
// });
/* UPDATE ALL FLOWS */
document.getElementById("update-all-flows-button").onclick = () => {
    parent.postMessage({ pluginMessage: { type: "updateAllFlows" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("UPDATE_ALL_FLOWS_CLICKED");
};
/* TOGGLE VISIBILITY */
document.getElementById("toggle-visibility-button").onclick = () => {
    parent.postMessage({ pluginMessage: { type: "toggleVisibility" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    document.getElementById("icon--eye-open").classList.toggle("hide");
    document.getElementById("icon--eye-shut").classList.toggle("hide");
    amplitude.track("TOGGLE_VISIBILITY_CLICKED");
};
/* DRAW ON SELECTION */
document.getElementById("draw-on-selection").onchange = (e) => {
    parent.postMessage({ pluginMessage: { type: "drawOnSelection", checked: e.target.checked }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("DRAW_ON_SELECTION_TOGGLED", { action: e.target.checked ? "TURNED_ON" : "TURNED_OFF" });
};
// hide line segment elements on load
document.getElementById("t1-line").classList.add("hide");
document.getElementById("b1-line").classList.add("hide");
document.getElementById("l1-line").classList.add("hide");
document.getElementById("r1-line").classList.add("hide");
document.getElementById("t2-line").classList.add("hide");
document.getElementById("b2-line").classList.add("hide");
document.getElementById("l2-line").classList.add("hide");
document.getElementById("r2-line").classList.add("hide");
/***********************
 * Port click listeners
 ***********************/
let [A, B] = ["src", "dst"];
document.getElementById("t1-container").onclick = () => {
    document.getElementById("t1-container").classList.toggle("spotlight");
    ["b1-container", "l1-container", "r1-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: A, value: "T" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("b1-container").onclick = () => {
    document.getElementById("b1-container").classList.toggle("spotlight");
    ["t1-container", "l1-container", "r1-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: A, value: "B" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("l1-container").onclick = () => {
    document.getElementById("l1-container").classList.toggle("spotlight");
    ["b1-container", "t1-container", "r1-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: A, value: "L" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("r1-container").onclick = () => {
    document.getElementById("r1-container").classList.toggle("spotlight");
    ["b1-container", "l1-container", "t1-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: A, value: "R" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("t2-container").onclick = () => {
    document.getElementById("t2-container").classList.toggle("spotlight");
    ["b2-container", "l2-container", "r2-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: B, value: "T" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("b2-container").onclick = () => {
    document.getElementById("b2-container").classList.toggle("spotlight");
    ["r2-container", "l2-container", "t2-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: B, value: "B" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("l2-container").onclick = () => {
    document.getElementById("l2-container").classList.toggle("spotlight");
    ["r2-container", "b2-container", "t2-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: B, value: "L" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
document.getElementById("r2-container").onclick = () => {
    document.getElementById("r2-container").classList.toggle("spotlight");
    ["b2-container", "l2-container", "t2-container"].map((elementId) => {
        document.getElementById(elementId).classList.remove("spotlight");
    });
    parent.postMessage({ pluginMessage: { type: B, value: "R" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PORT_CLICKED");
};
/***************************
 * UI view change functions
 ***************************/
function showPaidAnnouncement() {
    document.getElementById("main-ui").classList.add("hide");
    document.getElementById("top-nav-bar").classList.add("hide");
    document.getElementById("paid-announcement").classList.remove("hide");
}
function hidePaidAnnouncement() {
    document.getElementById("paid-announcement").classList.add("hide");
    document.getElementById("top-nav-bar").classList.remove("hide");
    document.getElementById("main-ui").classList.remove("hide");
    parent.postMessage({ pluginMessage: { type: "dismissedPaidAnnouncement" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("PAID_ANNOUNCEMENT_DISMISSED");
}
// function show50offPage() {
//     document.getElementById("main-ui").classList.add("hide");
//     document.getElementById("fifty-off-page").classList.remove("hide");
// }
// document.getElementById("fifty-off-text").onclick = () => launchCheckout(); //show50offPage();
// function hide50offPage() {
//     document.getElementById("main-ui").classList.remove("hide");
//     document.getElementById("fifty-off-page").classList.add("hide");
// }
// document.getElementById("fifty-off-done").onclick = () => hide50offPage();
// function tutorialStepper(step) {
//     var step1 = document.getElementById("step1");
//     var step2 = document.getElementById("step2");
//     var main = document.getElementById("main-ui");
//     var topNav = document.getElementById("top-nav-bar");
//     if (step === 0) {
//         topNav.classList.add("hide");
//         main.classList.add("hide");
//         step1.classList.remove("hide");
//     } else if (step === 1) {
//         // hide step 1, display step 2
//         step1.classList.add("hide");
//         step2.classList.remove("hide");
//     } else if (step === 2) {
//         // hide step 2, display main-ui
//         step2.classList.add("hide");
//         main.classList.remove("hide");
//         topNav.classList.remove("hide");
//     }
// }
function launchCheckout() {
    parent.postMessage({ pluginMessage: { type: "launchCheckout" }, pluginId: "733902567457592893" }, "https://www.figma.com");
    amplitude.track("UPGRADE_CLICKED");
}
// function openLicenseKeyPage() {
//     document.getElementById("main-ui").setAttribute("style", "display: none");
//     document.getElementById("license-key-page").setAttribute("style", "display: block");
//     amplitude.track("UPGRADE_CLICKED");
// }
// function backLicenseKeyPage() {
//     document.getElementById("license-key-page").setAttribute("style", "display: none");
//     document.getElementById("main-ui").setAttribute("style", "display: block");
// }
const getKey = (obj) => Object.keys(obj)[0];
const getVal = (obj) => Object.values(obj)[0];
onmessage = (event) => {
    const msg = event.data.pluginMessage;
    if (msg.focusTextOnPath) {
        window.setTimeout(() => document.getElementById("text-on-path").focus(), 0);
    }
    if (msg.focusTextInShape) {
        window.setTimeout(() => document.getElementById("text-in-shape").focus(), 0);
    }
    if (typeof msg.hideTextInShapeInput === "boolean") {
        if (msg.hideTextInShapeInput === true) {
            document.getElementById("text-in-shape").classList.add("hide");
            document.getElementById("create-shape-button").classList.remove("hide");
            // Clear textInShape entry field
            document.getElementById("text-in-shape").value = "";
        }
        else {
            document.getElementById("text-in-shape").classList.remove("hide");
            document.getElementById("create-shape-button").classList.add("hide");
            // Populate textInShape entry field
            document.getElementById("text-in-shape").value = msg.textInShape;
            //(<HTMLInputElement>document.getElementById("text-in-shape")).focus();
        }
    }
    if (msg.insertedTextIntoShape) {
        amplitude.track("INSERTED_TEXT_INTO_SHAPE");
    }
    if (msg.switchToFlowsUI) {
        switchToFlowsUI(msg.userPaidStatus);
    }
    if (msg.switchToShapesUI) {
        switchToShapesUI();
    }
    if (msg.updateShapePreview) {
        const dashDict = {
            SOLID: [],
            DASHED: [msg.styles.weight * 3],
            DOTTED: [msg.styles.weight, msg.styles.weight * 3],
        };
        const options = {
            fill: `#${msg.styles.fill}`,
            stroke: `#${msg.styles.stroke}`,
            fillStyle: msg.styles.hachure,
            strokeWidth: msg.styles.weight,
            roughness: msg.styles.roughness,
            hachureGap: 2.5 * msg.styles.weight,
            fillWeight: msg.styles.weight / 2,
            strokeLineDash: dashDict[msg.styles.dash],
        };
        let shape;
        if (msg.styles.shape === "RECTANGLE") {
            shape = rc.rectangle(0, 0, 100, 100, options);
            document.getElementById("shapes-screen-svg").setAttribute("viewBox", "-30 -30 160 160");
        }
        else if (msg.styles.shape === "CIRCLE") {
            shape = rc.circle(56.42, 56.42, 112.84, options);
            document.getElementById("shapes-screen-svg").setAttribute("viewBox", "-25.39 -25.39 160 160");
        }
        else if (msg.styles.shape === "DIAMOND") {
            //shape = rc.path("m0 50l50 -50l50 50l-50 50l-50 -50z", msg.generateShape.options);
            shape = rc.path("m0 70.71l70.71 -70.71l70.71 70.71l-70.71 70.71l-70.71 -70.71z", options);
            document.getElementById("shapes-screen-svg").setAttribute("viewBox", "-7.2 -7.2 160 160");
        }
        if (msg.styles.shape) {
            document.getElementById("shapes-screen-svg").replaceChildren();
            document.getElementById("shapes-screen-svg").appendChild(shape);
        }
        const [fill, stroke] = [shape.children[0], shape.children[1]];
        if (msg.styles.stroke) {
            stroke.setAttribute("stroke", `${msg.styles.stroke === "none" ? "" : "#"}${msg.styles.stroke}`);
            if (msg.styles.stroke !== "none") {
                defaultStrokeColor = msg.styles.stroke;
                shapesStrokeToColor(msg.styles.stroke);
            }
            else
                shapesStrokeToNone();
        }
        if (msg.styles.fill) {
            fill.setAttribute("stroke", `${msg.styles.fill === "none" ? "" : "#"}${msg.styles.fill}`);
            if (msg.styles.fill !== "none") {
                //defaultFillColor = msg.styles.fill;
                shapeFillToColor(msg.styles.fill);
            }
            else
                shapeFillToNone();
        }
    }
    if (msg.editShape) {
        const dashDict = {
            SOLID: [],
            DASHED: [msg.styles.weight * 3],
            DOTTED: [msg.styles.weight, msg.styles.weight * 3],
        };
        const options = {
            fill: `#${msg.styles.fill}`,
            stroke: `#${msg.styles.stroke}`,
            fillStyle: msg.styles.hachure,
            strokeWidth: msg.styles.weight,
            roughness: msg.styles.roughness,
            hachureGap: 2.5 * msg.styles.weight,
            fillWeight: msg.styles.weight / 2,
            strokeLineDash: dashDict[msg.styles.dash],
        };
        const [width, height] = [msg.editShape.width, msg.editShape.height];
        let shape;
        if (msg.styles.shape === "RECTANGLE") {
            shape = rc.rectangle(0, 0, width, height, options);
        }
        else if (msg.styles.shape === "CIRCLE") {
            shape = rc.ellipse(width / 2, height / 2, width, height, options);
        }
        else if (msg.styles.shape === "DIAMOND") {
            shape = rc.path("m0 70.71l70.71 -70.71l70.71 70.71l-70.71 70.71l-70.71 -70.71z", options);
        }
        const [fill, stroke] = [shape.children[0], shape.children[1]];
        const [fillPath, strokePath] = [fill.getAttribute("d"), stroke.getAttribute("d")];
        parent.postMessage({
            pluginMessage: {
                type: "editShape",
                fillPath: msg.styles.fill === "none" ? "" : fillPath,
                strokePath: msg.styles.stroke === "none" ? "" : strokePath,
                frameId: msg.editShape.frameId,
                width: width,
                height: height,
            },
            pluginId: "733902567457592893",
        }, "https://www.figma.com");
    }
    if (msg.roughifyVector) {
        const g = rc.path(msg.roughifyVector);
        const path = g.children[0];
        const d = path.getAttribute("d");
        parent.postMessage({
            pluginMessage: {
                type: "roughifyVector",
                value: d,
                vectorId: msg.vectorId,
                cornerRadius: msg.cornerRadius,
            },
            pluginId: "733902567457592893",
        }, "https://www.figma.com");
    }
    if (msg.roughifyTextBox) {
        const rect = rc.rectangle(0, 0, msg.width, msg.height);
        const path = rect.children[0];
        const d = path.getAttribute("d");
        parent.postMessage({
            pluginMessage: { type: "roughifyTextBox", value: d, vectorId: msg.roughifyTextBox, width: msg.width, height: msg.height, x: msg.x, y: msg.y },
            pluginId: "733902567457592893",
        }, "https://www.figma.com");
    }
    /*********************
     * Custom shape styles
     *********************/
    if (msg.shape) {
        const index = ["RECTANGLE", "CIRCLE", "DIAMOND"].indexOf(msg.shape);
        for (const [i, elem] of [radioRectangle, radioCircle, radioDiamond].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    if (msg.stroke) {
        document.getElementById("color-swatch-shapes-stroke").style.background = `#${msg.stroke}`;
        document.getElementById("color-picker-shapes-stroke").setAttribute("initial-value", msg.stroke);
        document.getElementById("color-picker-shapes-stroke").value = msg.stroke;
        document.getElementById("text-in-shape").style.borderColor = `#${msg.stroke}`;
    }
    if (msg.fill) {
        if (msg.fill !== "none")
            document.getElementById("color-swatch-shapes-fill").style.background = `#${msg.fill}`;
        document.getElementById("color-picker-shapes-fill").setAttribute("initial-value", msg.fill);
        document.getElementById("color-picker-shapes-fill").value = msg.fill;
    }
    if (msg.dash) {
        const index = ["SOLID", "DASHED", "DOTTED"].indexOf(msg.dash);
        for (const [i, elem] of [radioDashSolid, radioDashDashed, radioDashDotted].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
        document.getElementById("text-in-shape").style.borderStyle = msg.dash.toLowerCase();
    }
    if (msg.weight) {
        const index = [1, 2, 3].indexOf(msg.weight);
        for (const [i, elem] of [radioWeight1, radioWeight2, radioWeight3].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
        document.getElementById("text-in-shape").style.borderWidth = `${Math.max(msg.weight, 1.5)}`;
    }
    if (msg.hachure) {
        const index = ["hachure", "cross-hatch", "solid"].indexOf(msg.hachure);
        for (const [i, elem] of [hatchingHachure, hatchingCrossHatch, hatchingSolid].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    if (typeof msg.roughness === "number") {
        const index = [0, 0.5, 2].indexOf(msg.roughness);
        for (const [i, elem] of [roughness1, roughness2, roughness3].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    if (msg.fontFamily) {
        const index = ["Gloria Hallelujah", "Inter", "Courier"].indexOf(msg.fontFamily);
        for (const [i, elem] of [fontFamilyGloria, fontFamilyInter, fontFamilyCourier].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    if (msg.fontSize) {
        const index = [12, 18, 30].indexOf(msg.fontSize);
        for (const [i, elem] of [fontSize1, fontSize2, fontSize3].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    if (msg.textAlign) {
        const index = ["LEFT", "CENTER", "RIGHT"].indexOf(msg.textAlign);
        for (const [i, elem] of [textAlignLeft, textAlignCenter, textAlignRight].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    /***************
     * Custom ports
     ***************/
    if (msg.flowSelected) {
        // unhide default cover
        document.getElementById("ports-cover").setAttribute("style", "display: none");
        [A, B] = msg.flowSelected.AisSrc ? ["src", "dst"] : ["dst", "src"];
        const [nameA, nameB] = [msg.flowSelected.nameA, msg.flowSelected.nameB];
        const [boxA, boxB] = [document.getElementById("boxA"), document.getElementById("boxB")];
        [boxA.innerHTML, boxB.innerHTML] = [nameA, nameB];
        if (boxA.clientWidth > 56)
            boxA.innerHTML = `${nameA.substring(0, 2)}...${nameA.substring(nameA.length - 2, nameA.length)}`;
        if (boxB.clientWidth > 56)
            boxB.innerHTML = `${nameB.substring(0, 2)}...${nameB.substring(nameB.length - 2, nameB.length)}`;
        // initialize spotlight preference(s)
        document.getElementById("t1-container").classList.remove("spotlight");
        document.getElementById("r1-container").classList.remove("spotlight");
        document.getElementById("b1-container").classList.remove("spotlight");
        document.getElementById("l1-container").classList.remove("spotlight");
        document.getElementById("t2-container").classList.remove("spotlight");
        document.getElementById("r2-container").classList.remove("spotlight");
        document.getElementById("b2-container").classList.remove("spotlight");
        document.getElementById("l2-container").classList.remove("spotlight");
        msg.flowSelected.preferredPorts.map((preferredPort) => {
            let direction = getVal(preferredPort).toLowerCase();
            let number = getKey(preferredPort) === A ? 1 : 2;
            document.getElementById(`${direction}${number}-container`).classList.add("spotlight");
        });
        // initialize possible ports
        document.getElementById("t1").setAttribute("class", msg.flowSelected.srcT ? "dot-on" : "dot-off");
        document.getElementById("r1").setAttribute("class", msg.flowSelected.srcR ? "dot-on" : "dot-off");
        document.getElementById("b1").setAttribute("class", msg.flowSelected.srcB ? "dot-on" : "dot-off");
        document.getElementById("l1").setAttribute("class", msg.flowSelected.srcL ? "dot-on" : "dot-off");
        document.getElementById("t2").setAttribute("class", msg.flowSelected.dstT ? "dot-on" : "dot-off");
        document.getElementById("r2").setAttribute("class", msg.flowSelected.dstR ? "dot-on" : "dot-off");
        document.getElementById("b2").setAttribute("class", msg.flowSelected.dstB ? "dot-on" : "dot-off");
        document.getElementById("l2").setAttribute("class", msg.flowSelected.dstL ? "dot-on" : "dot-off");
        // initialize current active ports
        const [currSrcPort, currDstPort] = [msg.flowSelected.currSrcPort, msg.flowSelected.currDstPort];
        document.getElementById("t1-line").classList.add("hide");
        document.getElementById("b1-line").classList.add("hide");
        document.getElementById("l1-line").classList.add("hide");
        document.getElementById("r1-line").classList.add("hide");
        document.getElementById("t2-line").classList.add("hide");
        document.getElementById("b2-line").classList.add("hide");
        document.getElementById("l2-line").classList.add("hide");
        document.getElementById("r2-line").classList.add("hide");
        document.getElementById(`${currSrcPort.toLowerCase()}1-line`).classList.remove("hide");
        document.getElementById(`${currDstPort.toLowerCase()}2-line`).classList.remove("hide");
        // populate textOnPath entry field
        document.getElementById("text-on-path").value = msg.flowSelected.textOnPath;
        //(<HTMLInputElement>document.getElementById("text-on-path")).focus();
    }
    if (msg.flowNotSelected) {
        // restore default cover
        document.getElementById("ports-cover").setAttribute("style", "display: flex");
        // hide all line segment elements
        document.getElementById("t1-line").classList.add("hide");
        document.getElementById("b1-line").classList.add("hide");
        document.getElementById("l1-line").classList.add("hide");
        document.getElementById("r1-line").classList.add("hide");
        document.getElementById("t2-line").classList.add("hide");
        document.getElementById("b2-line").classList.add("hide");
        document.getElementById("l2-line").classList.add("hide");
        document.getElementById("r2-line").classList.add("hide");
        // hide all spotlight elements
        document.getElementById("t1-container").classList.remove("spotlight");
        document.getElementById("r1-container").classList.remove("spotlight");
        document.getElementById("b1-container").classList.remove("spotlight");
        document.getElementById("l1-container").classList.remove("spotlight");
        document.getElementById("t2-container").classList.remove("spotlight");
        document.getElementById("r2-container").classList.remove("spotlight");
        document.getElementById("b2-container").classList.remove("spotlight");
        document.getElementById("l2-container").classList.remove("spotlight");
        // clear textOnPath entry field
        document.getElementById("text-on-path").value = "";
    }
    if (msg.updateCurrentPorts) {
        const [currSrcPort, currDstPort] = [msg.updateCurrentPorts.currSrcPort, msg.updateCurrentPorts.currDstPort];
        document.getElementById("t1-line").classList.add("hide");
        document.getElementById("b1-line").classList.add("hide");
        document.getElementById("l1-line").classList.add("hide");
        document.getElementById("r1-line").classList.add("hide");
        document.getElementById("t2-line").classList.add("hide");
        document.getElementById("b2-line").classList.add("hide");
        document.getElementById("l2-line").classList.add("hide");
        document.getElementById("r2-line").classList.add("hide");
        document.getElementById(`${currSrcPort.toLowerCase()}1-line`).classList.remove("hide");
        document.getElementById(`${currDstPort.toLowerCase()}2-line`).classList.remove("hide");
    }
    /**********************
     * Tutorial & analytics
     **********************/
    if (msg.pluginOpened) {
        amplitude.setUserId(msg.pluginOpened.userId);
        const identifyObj = new Identify();
        identifyObj.set("user_paid_status", msg.pluginOpened.userPaidStatus);
        identifyObj.setOnce("user_name", msg.pluginOpened.userName);
        identifyObj.setOnce("is_legacy_user", parseInt(msg.pluginOpened.totalLegacyFlowsInFile) > 0);
        amplitude.identify(identifyObj);
        amplitude.track("PLUGIN_OPENED", {
            userName: msg.pluginOpened.userName,
            userPaidStatus: msg.pluginOpened.userPaidStatus,
            totalFlowsOnPage: msg.pluginOpened.totalFlowsOnPage,
            totalFlowsOnPageWithText: msg.pluginOpened.totalFlowsOnPageWithText,
            totalLegacyFlowsOnPage: msg.pluginOpened.totalLegacyFlowsOnPage,
            childrenOnPage: msg.pluginOpened.childrenOnPage,
            totalFlowsInFile: msg.pluginOpened.totalFlowsInFile,
            totalFlowsInFileWithText: msg.pluginOpened.totalFlowsInFileWithText,
            totalLegacyFlowsInFile: msg.pluginOpened.totalLegacyFlowsInFile,
            totalShapesInFile: msg.pluginOpened.totalShapesInFile,
            pagesInFile: msg.pluginOpened.pagesInFile,
        });
        amplitude.flush();
        // TODO: track user's paid status
    }
    if (msg.paidAnnouncementStatus === false) {
        showPaidAnnouncement();
    }
    if (msg.purchaseCompleted === true) {
        amplitude.track("PURCHASE_COMPLETED");
    }
    if (msg.newFlowDrawn) {
        // Workaround: Amplitude doesn't seem to recognize null or {} values for .rough
        msg.newFlowDrawn.rough = msg.newFlowDrawn.rough === null ? "SMOOTH" : "SKETCHY";
        amplitude.track("FLOW_DRAWN", msg.newFlowDrawn);
    }
    if (msg.userPaymentStatus === "PAID") {
        document.getElementById("footer").classList.remove("footer");
        document.getElementById("footer").classList.add("hide");
    }
    if (msg.showConnectorsTab === true) {
        document.getElementById("connectors-nav-item").classList.remove("hide");
        amplitude.track("CONNECTORS_TAB_SHOWN");
    }
    /*********************
     * Custom flow styles
     *********************/
    if (msg.strokeColor) {
        document.getElementById("color-swatch-flows").style.background = `#${msg.strokeColor}`;
        document.getElementById("color-picker-flows").setAttribute("initial-value", msg.strokeColor);
        document.getElementById("color-picker-flows").value = msg.strokeColor;
        document.getElementById("text-on-path").style.borderColor = msg.strokeColor;
    }
    if (msg.strokeOpacity) {
        document.getElementById("stroke-opacity").setAttribute("initial-value", `${msg.strokeOpacity}%`);
        document.getElementById("stroke-opacity").value = `${msg.strokeOpacity}%`;
        const rgb = hexToRGB255(document.getElementById("color-picker-flows").value);
        document.getElementById("text-on-path").style.borderColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${msg.strokeOpacity / 100})`;
    }
    if (msg.strokeWeight) {
        document.getElementById("stroke-weight").setAttribute("initial-value", msg.strokeWeight);
        document.getElementById("stroke-weight").value = msg.strokeWeight;
    }
    if (msg.cornerRadius) {
        document.getElementById("corner-radius").setAttribute("initial-value", msg.cornerRadius);
        document.getElementById("corner-radius").value = msg.cornerRadius;
    }
    if (msg.dashPattern) {
        const msgAsString = msg.dashPattern.join(", ");
        document.getElementById("dash-pattern").setAttribute("initial-value", msgAsString === "0" ? "" : msgAsString);
        document.getElementById("dash-pattern").value = msgAsString === "0" ? "" : msgAsString;
        document.getElementById("text-on-path").style.borderStyle = ["0", ""].includes(msgAsString)
            ? "solid"
            : dashedOrDotted(msg.dashPattern);
    }
    if (msg.offsetStart) {
        document.getElementById("offset-src").setAttribute("initial-value", msg.offsetStart === "0" ? "" : msg.offsetStart);
        document.getElementById("offset-src").value = msg.offsetStart === "0" ? "" : msg.offsetStart;
    }
    if (msg.offsetEnd) {
        document.getElementById("offset-dst").setAttribute("initial-value", msg.offsetEnd === "0" ? "" : msg.offsetEnd);
        document.getElementById("offset-dst").value = msg.offsetEnd === "0" ? "" : msg.offsetEnd;
    }
    if (msg.terminalStart) {
        if (!["NONE", "OPEN", "DOT", "FLAT"].includes(msg.terminalStart))
            msg.terminalStart = "NONE";
        document.querySelector(".is-visible1").classList.remove("is-visible1");
        document.querySelector('[start-terminal="' + msg.terminalStart + '"]').classList.add("is-visible1");
        document.getElementById("start-terminal-select").value = msg.terminalStart;
    }
    if (msg.terminalEnd) {
        if (!["NONE", "ARROW_LINES", "ARROW_EQUILATERAL"].includes(msg.terminalEnd))
            msg.terminalEnd = "NONE";
        document.querySelector(".is-visible2").classList.remove("is-visible2");
        document.querySelector('[end-terminal="' + msg.terminalEnd + '"]').classList.add("is-visible2");
        document.getElementById("end-terminal-select").value = msg.terminalEnd;
    }
    if (msg.geometry) {
        if (!["RIGHT_ANGLE", "BEZIER"].includes(msg.geometry))
            msg.geometry = "RIGHT_ANGLE";
        const index = ["STRAIGHT", "BEZIER", "RIGHT_ANGLE"].indexOf(msg.geometry);
        for (const [i, elem] of [radioStraight, radioBezier, radioRightAngle].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    if (msg.rough || msg.rough === null) {
        let value;
        if (msg.rough === null)
            value = "SMOOTH";
        else
            value = "SKETCHY";
        const index = ["SMOOTH", "SKETCHY"].indexOf(value);
        for (const [i, elem] of [radioSmooth, radioSketchy].entries()) {
            if (i === index)
                elem.classList.add("homemade-radio-selected");
            else
                elem.classList.remove("homemade-radio-selected");
        }
    }
    /*********************
     * Other
     *********************/
    if (typeof msg.totalFlowCountInFile === "number") {
        if (msg.totalFlowCountInFile >= 45) {
            document.getElementById("free-trial-counter").classList.remove("hide");
            document.getElementById("free-trial-counter").innerText = `(${msg.totalFlowCountInFile}/50)`;
        }
        else {
            document.getElementById("free-trial-counter").classList.add("hide");
        }
    }
    let checked = document.getElementById("draw-on-selection").checked;
    if (msg.noFlowsOnPage === true && !checked) {
        document.getElementById("ports-cover-text-default").classList.add("hide");
        document.getElementById("ports-cover-text-empty").classList.add("hide");
        document.getElementById("ports-cover-text-disabled").classList.remove("hide");
    }
    else if (msg.noFlowsOnPage === true && checked) {
        document.getElementById("ports-cover-text-default").classList.add("hide");
        document.getElementById("ports-cover-text-empty").classList.remove("hide");
        document.getElementById("ports-cover-text-disabled").classList.add("hide");
    }
    else if (msg.noFlowsOnPage === false) {
        document.getElementById("ports-cover-text-default").classList.remove("hide");
        document.getElementById("ports-cover-text-empty").classList.add("hide");
        document.getElementById("ports-cover-text-disabled").classList.add("hide");
    }
    if (msg.userHitTrialPaywall) {
        amplitude.track("USER_HIT_TRIAL_PAYWALL", msg.userHitTrialPaywall);
    }
    if (msg.resetVisibility) {
        document.getElementById("icon--eye-open").classList.remove("hide");
        document.getElementById("icon--eye-shut").classList.add("hide");
    }
    // if (msg.openLicenseKeyPage) {
    //     openLicenseKeyPage();
    // }
    // if (msg.licenseKeySuccess === true) {
    //     document.getElementById("license-key-success-text").setAttribute("style", "display: block");
    //     document.getElementById("free-trial-counter").setAttribute("style", "display: none");
    //     (<HTMLInputElement>document.getElementById("license-key-input")).setAttribute("disabled", "");
    //     (<HTMLInputElement>document.getElementById("activate-license-key-button")).setAttribute("disabled", "");
    // } else if (msg.licenseKeySuccess === false) {
    //     document.getElementById("invalid-license-key-error-text").setAttribute("style", "display: block");
    // }
    // if (msg.licenseKeyActivationError === true) {
    //     document.getElementById("license-key-validation-error-text").setAttribute("style", "display: block");
    // }
};
function colorPickerFlows(event) {
    let value = event.target.value;
    const swatch = document.getElementById("color-swatch-flows");
    const colorPicker = document.getElementById("color-picker-flows");
    if (value.match(/^#?([A-Fa-f0-9]+)$/g)) {
        value = value[0] === "#" ? value.slice(1) : value;
        value = (value.length < 6 ? value.repeat(6) : value).slice(0, 6).toUpperCase();
        swatch.style.background = `#${value}`;
        colorPicker.value = value;
        const rgb = hexToRGB255(value);
        const opacity = document.getElementById("stroke-opacity").value;
        document.getElementById("text-on-path").style.borderColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${parseInt(opacity) / 100})`;
        if (colorPicker.getAttribute("initial-value") !== value) {
            parent.postMessage({ pluginMessage: { type: "strokeColor", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
            amplitude.track("FLOW_COLOR_CHANGED", { color: value });
        }
        colorPicker.setAttribute("initial-value", value);
    }
    else {
        colorPicker.value = colorPicker.getAttribute("initial-value");
    }
}
function strokeOpacity(event) {
    let value = event.target.value;
    const strokeOpacity = document.getElementById("stroke-opacity");
    if (value.match(/^([0-9]+)%?$/g)) {
        value = value[value.length - 1] === "%" ? value.slice(0, -1) : value;
        value = parseInt(value) < 100 ? parseInt(value) : 100;
        value = value === 0 ? 1 : value;
        strokeOpacity.value = `${value}%`;
        strokeOpacity.setAttribute("initial-value", `${value}%`);
        const rgb = hexToRGB255(document.getElementById("color-picker-flows").value);
        document.getElementById("text-on-path").style.borderColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${value / 100})`;
        parent.postMessage({ pluginMessage: { type: "strokeOpacity", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    else {
        strokeOpacity.value = strokeOpacity.getAttribute("initial-value");
    }
}
function strokeWeight(event) {
    let value = event.target.value;
    const strokeWeight = document.getElementById("stroke-weight");
    if (value.match(/^([0-9]+)$/g)) {
        value = parseInt(value) < 100 ? parseInt(value) : 100;
        value = value === 0 ? 1 : value;
        strokeWeight.value = value;
        strokeWeight.setAttribute("initial-value", value);
        parent.postMessage({ pluginMessage: { type: "strokeWeight", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    else {
        strokeWeight.value = strokeWeight.getAttribute("initial-value");
    }
}
function cornerRadius(event) {
    let value = event.target.value;
    const cornerRadius = document.getElementById("corner-radius");
    if (value.match(/^([0-9]+)$/g)) {
        value = parseInt(value) < 999 ? parseInt(value) : 999;
        cornerRadius.value = value;
        cornerRadius.setAttribute("initial-value", value);
        parent.postMessage({ pluginMessage: { type: "cornerRadius", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    else {
        cornerRadius.value = cornerRadius.getAttribute("initial-value");
    }
}
const diff = (A) => {
    return A.slice(1).map((item, index) => {
        return A[index] - item;
    });
};
const dashedOrDotted = (dashPattern) => {
    let arr = dashPattern.filter((n) => n !== 0);
    arr = arr.length % 2 ? arr.concat(arr) : arr;
    let diffs = diff(arr);
    let diffsAbs = diffs.map((n) => Math.abs(n));
    let i = diffsAbs.indexOf(Math.max(...diffsAbs));
    let isDashDominant = (i % 2 === 0 && diffs[i] >= 0) || (i % 2 === 1 && diffs[i] <= 0);
    let isDashDwarfedByGap = Math.max(arr[i], arr[i + 1]) ** 2 > diffsAbs[i] ** 3;
    return (isDashDominant || isDashDwarfedByGap) && arr[i] > 3 ? "dashed" : "dotted";
};
function dashPattern(event) {
    let value = event.target.value;
    const dashPattern = document.getElementById("dash-pattern");
    if (value === "" || value.match(/^\s*[0-9]+(\s*[,\s]\s*[0-9]+)*(\s*,?\s*)$/g)) {
        const valueAsString = value
            .split(/\s*[,\s]\s*/g)
            .filter((s) => s.length)
            .map((s) => `${parseInt(s)}`)
            .slice(0, 8)
            .join(", ");
        const valueAsArray = valueAsString === "" ? [0] : valueAsString.split(", ").map((n) => parseInt(n));
        dashPattern.value = valueAsString === "0" ? "" : valueAsString;
        document.getElementById("text-on-path").style.borderStyle = ["", "0"].includes(valueAsString)
            ? "solid"
            : dashedOrDotted(valueAsArray);
        dashPattern.setAttribute("initial-value", valueAsString);
        parent.postMessage({ pluginMessage: { type: "dashPattern", value: valueAsArray }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    else {
        dashPattern.value = dashPattern.getAttribute("initial-value");
    }
}
function offsetStart(event) {
    let value = event.target.value;
    const offsetStart = document.getElementById("offset-src");
    if (value.match(/^([0-9]*)$/g)) {
        let int = parseInt(value);
        if (Number.isNaN(int)) {
            value = 0;
        }
        else if (int < 100) {
            value = int;
        }
        else {
            value = 100;
        }
        offsetStart.value = value === 0 ? "" : value;
        offsetStart.setAttribute("initial-value", value === 0 ? "" : value);
        parent.postMessage({ pluginMessage: { type: "offsetStart", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    else {
        offsetStart.value = offsetStart.getAttribute("initial-value");
    }
}
function offsetEnd(event) {
    let value = event.target.value;
    const offsetEnd = document.getElementById("offset-dst");
    if (value.match(/^([0-9]*)$/g)) {
        let int = parseInt(value);
        if (Number.isNaN(int)) {
            value = 0;
        }
        else if (int < 100) {
            value = int;
        }
        else {
            value = 100;
        }
        offsetEnd.value = value === 0 ? "" : value;
        offsetEnd.setAttribute("initial-value", value === 0 ? "" : value);
        parent.postMessage({ pluginMessage: { type: "offsetEnd", value: value }, pluginId: "733902567457592893" }, "https://www.figma.com");
    }
    else {
        offsetEnd.value = offsetEnd.getAttribute("initial-value");
    }
}
let updateStartTerminal = function (e) {
    document.querySelector(".is-visible1").classList.remove("is-visible1");
    document.querySelector('[start-terminal="' + e.target.value + '"]').classList.add("is-visible1");
    parent.postMessage({ pluginMessage: { type: "terminalStart", value: e.target.value }, pluginId: "733902567457592893" }, "https://www.figma.com");
};
document.getElementById("start-terminal-select").addEventListener("change", updateStartTerminal);
let updateEndTerminal = function (e) {
    document.querySelector(".is-visible2").classList.remove("is-visible2");
    document.querySelector('[end-terminal="' + e.target.value + '"]').classList.add("is-visible2");
    parent.postMessage({ pluginMessage: { type: "terminalEnd", value: e.target.value }, pluginId: "733902567457592893" }, "https://www.figma.com");
};
document.getElementById("end-terminal-select").addEventListener("change", updateEndTerminal);
// const onLicenseKeyInputChange = () => {
//     document.getElementById("invalid-license-key-error-text").setAttribute("style", "display: none");
//     document.getElementById("empty-license-key-error-text").setAttribute("style", "display: none");
//     document.getElementById("license-key-validation-error-text").setAttribute("style", "display: none");
// };
