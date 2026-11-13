import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "zh", label: "简体中文" },
  { value: "ja", label: "日本語" },
] as const;
export type Locale = (typeof LANGUAGES)[number]["value"];

const en = {
  importMedia: "Import media",
  importMediaTitle: "Import videos, photos or audio into your edit",
  text: "Text",
  addText: "Add text",
  subtitles: "Subtitles",
  openClipline: "Open .clipline",
  openProjectTitle: "Open a saved .clipline or legacy .cutline project (Ctrl+O)",
  help: "Help",
  helpTitle: "Clipline help",
  newProject: "New project",
  newProjectTitle: "New project — clear browser draft",
  save: "Save",
  saveProjectTitle: "Save project (Ctrl+S)",
  aspectRatio: "Aspect ratio",
  canvasAspectRatio: "Canvas aspect ratio",
  exportResolution: "Export resolution",
  exportFormat: "Export format",
  auto: "Auto",
  unsupported: "unsupported",
  exporting: "Exporting {progress}%",
  export: "Export",
  language: "Language",
  startNewProject: "Start a new project?",
  newProjectDescription: "This removes the current browser draft and its cached media. Download a .clipline file first if you want to keep this edit.",
  cancel: "Cancel",
  startFresh: "Start fresh",
  restoringDraft: "Restoring draft…",
  savedBrowser: "Saved to browser",
  noDraft: "No draft yet",
  autosaveUnavailable: "Autosave unavailable",
  draftOpenError: "Your previous browser draft could not be opened. Save a .clipline file to keep new edits.",
  saving: "Saving…",
  autosaveFailed: "Autosave failed",
  draftSaveError: "Browser storage is full or unavailable. Save a .clipline file to keep your edits.",
  draftClearError: "The browser draft could not be cleared. Your current edit has been kept.",
  couldntImport: "Couldn't import: {files}",
  unsupportedFile: "This browser can't read that file format.",
  defaultText: "Your text",
  openConfirm: "Open another project? Unsaved changes will be lost.",
  invalidProject: "That file isn't a Clipline project.",
  exportUnsupported: "This browser can't record video exports.",
  cliplineHelp: "Clipline help",
  helpDescription: "Editing, project files and keyboard shortcuts.",
  mediaProjectFiles: "Media and project files",
  helpImportMedia: "Import media adds videos, photos or audio to your timeline.",
  helpOpenProject: "Open .clipline restores a saved edit, including its media and settings. Older .cutline projects also work.",
  helpSaveExport: "Save downloads an editable .clipline project. Export creates a finished video. Edits and media autosave in this browser and restore when you return. Clearing browser data removes the draft; save a file for a permanent backup. New project clears the browser draft.",
  editingTextGlow: "Editing and text glow",
  helpTimeline: "Drag timeline clips to move them, their edges to trim, or up and down to change tracks. Select a clip to change its properties.",
  helpPreview: "While paused, drag text, video or photos in the preview to move them. Drag the rotation button below the selection to rotate; hold Shift to snap. Drag the resize button outward to enlarge or inward to shrink.",
  helpGlowKeyframes: "Select text and turn on Glow in Properties, then choose its color and strength. Use the diamond above the timeline to key all properties at once. Change several properties or drag the preview at a new time to animate them, and choose easing to shape movement. The arrows jump between keyframes. The Subtitles tab adds timed captions, burns them into exported videos, and exports SRT, VTT or styled ASS files.",
  keyboardShortcuts: "Keyboard shortcuts",
  playPause: "Play / pause",
  stepFrame: "Step a frame (paused)",
  splitPlayhead: "Split at playhead",
  deleteSelection: "Delete selection",
  undo: "Undo",
  redo: "Redo",
  redoAlternative: "Redo (alternative)",
  saveProject: "Save project",
  openProject: "Open project",
  spaceKey: "Space",
  deleteKey: "Delete",
  videoPreview: "Video preview",
  rotateSelection: "Rotate selection",
  dragRotate: "Drag to rotate",
  resizeSelection: "Resize selection",
  dragResize: "Drag to resize",
  emptyPreview: "Import video, photos or audio to start editing",
  audioWaveform: "Audio waveform",
  editorPanels: "Editor panels",
  properties: "Properties",
  selectSomething: "Select something on the timeline. Drag items to move them, drag their edges to trim, and drag up or down to change track.",
  textContent: "Text content",
  speed: "Speed",
  animation: "Animation",
  transition: "Transition",
  in: "in",
  out: "out",
  durationSeconds: "Duration (s)",
  transformColor: "Transform & color",
  colorPreset: "Color preset",
  custom: "Custom",
  keyframeEasing: "Keyframe easing",
  delete: "Delete",
  previousKeyframe: "Previous keyframe",
  nextKeyframe: "Next keyframe",
  removeKeyframe: "Remove keyframe",
  addKeyframe: "Add keyframe",
  keyAllProperties: "Key all properties",
  undoTitle: "Undo (Ctrl+Z)",
  redoTitle: "Redo (Ctrl+Shift+Z / Ctrl+Y)",
  splitTitle: "Split at playhead (S)",
  deleteTitle: "Delete",
  split: "Split",
  play: "Play",
  pause: "Pause",
  playPauseTitle: "Play / pause (Space)",
  zoom: "Zoom",
  zoomOut: "Zoom out",
  zoomIn: "Zoom in",
  resetZoom: "Reset zoom",
  reset: "Reset",
  jumpKeyframe: "Jump to keyframe",
  positionX: "Position X",
  positionY: "Position Y",
  scale: "Scale",
  rotation: "Rotation",
  opacity: "Opacity",
  volume: "Volume",
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  warmth: "Warmth",
  hue: "Hue",
  transNone: "None",
  transFade: "Fade",
  transSlide: "Slide",
  transWipe: "Wipe",
  transZoom: "Zoom",
  transRise: "Rise",
  transBounce: "Bounce",
  transTypewriter: "Typewriter",
  easingLinear: "Linear",
  easingSineIn: "Sine in",
  easingSineOut: "Sine out",
  easingSineInOut: "Sine in/out",
  easingSmooth: "Smooth",
  presetOriginal: "Original",
  presetWarm: "Cinematic Warm",
  presetTeal: "Teal & Orange",
  presetVintage: "Vintage 90s",
  presetNoir: "Film Noir B&W",
  presetVibrant: "Vibrant Pop",
  presetCool: "Cool Cyberpunk",
  font: "Font",
  fontSize: "Font size",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  shadow: "Shadow",
  fill: "Fill",
  fillColor: "Fill color",
  stroke: "Stroke",
  strokeColor: "Stroke color",
  strokeWidth: "Stroke width",
  background: "Background",
  backgroundColor: "Background color",
  glow: "Glow",
  glowColor: "Glow color",
  glowStrength: "Glow strength",
  importSubtitles: "Import subtitles",
  addSubtitle: "Add subtitle",
  newSubtitle: "New subtitle",
  noSubtitleTimings: "No subtitle timings found in this file.",
  subtitleReadError: "This subtitle file could not be read.",
  burnSubtitles: "Burn subtitles into video",
  bottomMargin: "Bottom margin (%)",
  subtitleBottomMargin: "Subtitle bottom margin",
  subtitleExportFormat: "Subtitle export format",
  styledAss: "ASS (styled)",
  deleteSubtitle: "Delete subtitle {index}",
  subtitleField: "Subtitle {index} {field}",
  start: "start",
  end: "end",
};
export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;

const es: Dictionary = {
  importMedia: "Importar medios", importMediaTitle: "Importa videos, fotos o audio a tu edición", text: "Texto", addText: "Añadir texto", subtitles: "Subtítulos", openClipline: "Abrir .clipline", openProjectTitle: "Abrir un proyecto .clipline guardado o un proyecto antiguo .cutline (Ctrl+O)", help: "Ayuda", helpTitle: "Ayuda de Clipline", newProject: "Nuevo proyecto", newProjectTitle: "Nuevo proyecto: borrar el borrador del navegador", save: "Guardar", saveProjectTitle: "Guardar proyecto (Ctrl+S)", aspectRatio: "Relación de aspecto", canvasAspectRatio: "Relación de aspecto del lienzo", exportResolution: "Resolución de exportación", exportFormat: "Formato de exportación", auto: "Automático", unsupported: "no compatible", exporting: "Exportando {progress}%", export: "Exportar", language: "Idioma", startNewProject: "¿Empezar un proyecto nuevo?", newProjectDescription: "Esto elimina el borrador actual del navegador y sus medios guardados. Descarga primero un archivo .clipline si quieres conservar esta edición.", cancel: "Cancelar", startFresh: "Empezar de cero",
  restoringDraft: "Restaurando borrador…", savedBrowser: "Guardado en el navegador", noDraft: "Aún no hay borrador", autosaveUnavailable: "Autoguardado no disponible", draftOpenError: "No se pudo abrir el borrador anterior del navegador. Guarda un archivo .clipline para conservar las nuevas ediciones.", saving: "Guardando…", autosaveFailed: "Error de autoguardado", draftSaveError: "El almacenamiento del navegador está lleno o no disponible. Guarda un archivo .clipline para conservar tus ediciones.", draftClearError: "No se pudo borrar el borrador del navegador. Se ha conservado tu edición actual.", couldntImport: "No se pudo importar: {files}", unsupportedFile: "Este navegador no puede leer ese formato de archivo.", defaultText: "Tu texto", openConfirm: "¿Abrir otro proyecto? Se perderán los cambios sin guardar.", invalidProject: "Ese archivo no es un proyecto de Clipline.", exportUnsupported: "Este navegador no puede grabar exportaciones de video.",
  cliplineHelp: "Ayuda de Clipline", helpDescription: "Edición, archivos de proyecto y atajos de teclado.", mediaProjectFiles: "Medios y archivos de proyecto", helpImportMedia: "Importar medios añade videos, fotos o audio a tu línea de tiempo.", helpOpenProject: "Abrir .clipline restaura una edición guardada, incluidos sus medios y ajustes. Los proyectos antiguos .cutline también funcionan.", helpSaveExport: "Guardar descarga un proyecto editable .clipline. Exportar crea un video terminado. Las ediciones y los medios se guardan automáticamente en este navegador y se restauran al volver. Borrar los datos del navegador elimina el borrador; guarda un archivo como copia permanente. Nuevo proyecto borra el borrador del navegador.", editingTextGlow: "Edición y brillo del texto", helpTimeline: "Arrastra los clips de la línea de tiempo para moverlos, sus bordes para recortarlos, o arriba y abajo para cambiar de pista. Selecciona un clip para cambiar sus propiedades.", helpPreview: "Con la reproducción en pausa, arrastra texto, video o fotos en la vista previa para moverlos. Arrastra el botón de rotación bajo la selección para girar; mantén Shift para ajustar. Arrastra el botón de tamaño hacia fuera para ampliar o hacia dentro para reducir.", helpGlowKeyframes: "Selecciona el texto y activa Brillo en Propiedades; después elige su color e intensidad. Usa el rombo sobre la línea de tiempo para animar todas las propiedades a la vez. Cambia varias propiedades o arrastra la vista previa en otro momento para animarlas, y elige una interpolación para dar forma al movimiento. Las flechas saltan entre fotogramas clave. La pestaña Subtítulos añade subtítulos cronometrados, los integra en los videos exportados y exporta archivos SRT, VTT o ASS con estilo.", keyboardShortcuts: "Atajos de teclado", playPause: "Reproducir / pausar", stepFrame: "Avanzar un fotograma (en pausa)", splitPlayhead: "Dividir en el cabezal", deleteSelection: "Eliminar selección", undo: "Deshacer", redo: "Rehacer", redoAlternative: "Rehacer (alternativa)", saveProject: "Guardar proyecto", openProject: "Abrir proyecto", spaceKey: "Espacio", deleteKey: "Suprimir",
  videoPreview: "Vista previa del video", rotateSelection: "Girar selección", dragRotate: "Arrastra para girar", resizeSelection: "Cambiar tamaño de la selección", dragResize: "Arrastra para cambiar el tamaño", emptyPreview: "Importa video, fotos o audio para empezar a editar", audioWaveform: "Forma de onda de audio", editorPanels: "Paneles del editor", properties: "Propiedades", selectSomething: "Selecciona algo en la línea de tiempo. Arrastra los elementos para moverlos, sus bordes para recortarlos y arriba o abajo para cambiar de pista.", textContent: "Contenido del texto", speed: "Velocidad", animation: "Animación", transition: "Transición", in: "entrada", out: "salida", durationSeconds: "Duración (s)", transformColor: "Transformación y color", colorPreset: "Preajuste de color", custom: "Personalizado", keyframeEasing: "Interpolación de fotograma clave", delete: "Eliminar", previousKeyframe: "Fotograma clave anterior", nextKeyframe: "Fotograma clave siguiente", removeKeyframe: "Quitar fotograma clave", addKeyframe: "Añadir fotograma clave", keyAllProperties: "Animar todas las propiedades", undoTitle: "Deshacer (Ctrl+Z)", redoTitle: "Rehacer (Ctrl+Shift+Z / Ctrl+Y)", splitTitle: "Dividir en el cabezal (S)", deleteTitle: "Eliminar", split: "Dividir", play: "Reproducir", pause: "Pausar", playPauseTitle: "Reproducir / pausar (Espacio)", zoom: "Zoom", zoomOut: "Alejar", zoomIn: "Acercar", resetZoom: "Restablecer zoom", reset: "Restablecer", jumpKeyframe: "Ir al fotograma clave",
  positionX: "Posición X", positionY: "Posición Y", scale: "Escala", rotation: "Rotación", opacity: "Opacidad", volume: "Volumen", brightness: "Brillo", contrast: "Contraste", saturation: "Saturación", warmth: "Calidez", hue: "Tono",
  transNone: "Ninguna", transFade: "Fundido", transSlide: "Deslizar", transWipe: "Barrido", transZoom: "Zoom", transRise: "Elevar", transBounce: "Rebote", transTypewriter: "Máquina de escribir", easingLinear: "Lineal", easingSineIn: "Seno de entrada", easingSineOut: "Seno de salida", easingSineInOut: "Seno de entrada/salida", easingSmooth: "Suave", presetOriginal: "Original", presetWarm: "Cálido cinematográfico", presetTeal: "Verde azulado y naranja", presetVintage: "Años 90 retro", presetNoir: "Cine negro B/N", presetVibrant: "Pop vibrante", presetCool: "Ciberpunk frío",
  font: "Fuente", fontSize: "Tamaño de fuente", bold: "Negrita", italic: "Cursiva", underline: "Subrayado", shadow: "Sombra", fill: "Relleno", fillColor: "Color de relleno", stroke: "Contorno", strokeColor: "Color del contorno", strokeWidth: "Grosor del contorno", background: "Fondo", backgroundColor: "Color de fondo", glow: "Brillo", glowColor: "Color del brillo", glowStrength: "Intensidad del brillo",
  importSubtitles: "Importar subtítulos", addSubtitle: "Añadir subtítulo", newSubtitle: "Nuevo subtítulo", noSubtitleTimings: "No se encontraron tiempos de subtítulos en este archivo.", subtitleReadError: "No se pudo leer este archivo de subtítulos.", burnSubtitles: "Integrar subtítulos en el video", bottomMargin: "Margen inferior (%)", subtitleBottomMargin: "Margen inferior de subtítulos", subtitleExportFormat: "Formato de exportación de subtítulos", styledAss: "ASS (con estilo)", deleteSubtitle: "Eliminar subtítulo {index}", subtitleField: "Subtítulo {index}: {field}", start: "inicio", end: "fin",
};

const fr: Dictionary = {
  importMedia: "Importer des médias", importMediaTitle: "Importez des vidéos, photos ou fichiers audio dans votre montage", text: "Texte", addText: "Ajouter du texte", subtitles: "Sous-titres", openClipline: "Ouvrir .clipline", openProjectTitle: "Ouvrir un projet .clipline enregistré ou un ancien projet .cutline (Ctrl+O)", help: "Aide", helpTitle: "Aide de Clipline", newProject: "Nouveau projet", newProjectTitle: "Nouveau projet — effacer le brouillon du navigateur", save: "Enregistrer", saveProjectTitle: "Enregistrer le projet (Ctrl+S)", aspectRatio: "Format d’image", canvasAspectRatio: "Format d’image du canevas", exportResolution: "Résolution d’exportation", exportFormat: "Format d’exportation", auto: "Auto", unsupported: "non pris en charge", exporting: "Exportation {progress} %", export: "Exporter", language: "Langue", startNewProject: "Commencer un nouveau projet ?", newProjectDescription: "Cette action supprime le brouillon actuel du navigateur et ses médias en cache. Téléchargez d’abord un fichier .clipline si vous souhaitez conserver ce montage.", cancel: "Annuler", startFresh: "Repartir de zéro",
  restoringDraft: "Restauration du brouillon…", savedBrowser: "Enregistré dans le navigateur", noDraft: "Aucun brouillon", autosaveUnavailable: "Enregistrement automatique indisponible", draftOpenError: "Impossible d’ouvrir votre précédent brouillon. Enregistrez un fichier .clipline pour conserver les nouvelles modifications.", saving: "Enregistrement…", autosaveFailed: "Échec de l’enregistrement automatique", draftSaveError: "Le stockage du navigateur est plein ou indisponible. Enregistrez un fichier .clipline pour conserver vos modifications.", draftClearError: "Impossible d’effacer le brouillon du navigateur. Votre montage actuel a été conservé.", couldntImport: "Impossible d’importer : {files}", unsupportedFile: "Ce navigateur ne peut pas lire ce format de fichier.", defaultText: "Votre texte", openConfirm: "Ouvrir un autre projet ? Les modifications non enregistrées seront perdues.", invalidProject: "Ce fichier n’est pas un projet Clipline.", exportUnsupported: "Ce navigateur ne peut pas enregistrer d’exportations vidéo.",
  cliplineHelp: "Aide de Clipline", helpDescription: "Montage, fichiers de projet et raccourcis clavier.", mediaProjectFiles: "Médias et fichiers de projet", helpImportMedia: "Importer des médias ajoute des vidéos, photos ou fichiers audio à votre timeline.", helpOpenProject: "Ouvrir .clipline restaure un montage enregistré, avec ses médias et ses réglages. Les anciens projets .cutline fonctionnent aussi.", helpSaveExport: "Enregistrer télécharge un projet .clipline modifiable. Exporter crée une vidéo finalisée. Les modifications et les médias sont enregistrés automatiquement dans ce navigateur puis restaurés à votre retour. Effacer les données du navigateur supprime le brouillon ; enregistrez un fichier pour une sauvegarde permanente. Nouveau projet efface le brouillon du navigateur.", editingTextGlow: "Montage et halo du texte", helpTimeline: "Faites glisser les clips de la timeline pour les déplacer, leurs bords pour les rogner, ou vers le haut et le bas pour changer de piste. Sélectionnez un clip pour modifier ses propriétés.", helpPreview: "En pause, faites glisser le texte, la vidéo ou les photos dans l’aperçu pour les déplacer. Faites glisser le bouton de rotation sous la sélection pour pivoter ; maintenez Maj pour aligner l’angle. Faites glisser le bouton de redimensionnement vers l’extérieur pour agrandir ou vers l’intérieur pour réduire.", helpGlowKeyframes: "Sélectionnez le texte et activez Halo dans Propriétés, puis choisissez sa couleur et son intensité. Utilisez le losange au-dessus de la timeline pour animer toutes les propriétés à la fois. Modifiez plusieurs propriétés ou faites glisser l’aperçu à un autre instant pour les animer, puis choisissez une interpolation pour modeler le mouvement. Les flèches passent d’une image clé à l’autre. L’onglet Sous-titres ajoute des légendes synchronisées, les incruste dans les vidéos exportées et exporte des fichiers SRT, VTT ou ASS stylisés.", keyboardShortcuts: "Raccourcis clavier", playPause: "Lecture / pause", stepFrame: "Avancer d’une image (en pause)", splitPlayhead: "Diviser à la tête de lecture", deleteSelection: "Supprimer la sélection", undo: "Annuler", redo: "Rétablir", redoAlternative: "Rétablir (autre raccourci)", saveProject: "Enregistrer le projet", openProject: "Ouvrir un projet", spaceKey: "Espace", deleteKey: "Supprimer",
  videoPreview: "Aperçu vidéo", rotateSelection: "Faire pivoter la sélection", dragRotate: "Faites glisser pour pivoter", resizeSelection: "Redimensionner la sélection", dragResize: "Faites glisser pour redimensionner", emptyPreview: "Importez une vidéo, des photos ou du son pour commencer le montage", audioWaveform: "Forme d’onde audio", editorPanels: "Panneaux de l’éditeur", properties: "Propriétés", selectSomething: "Sélectionnez un élément sur la timeline. Faites glisser les éléments pour les déplacer, leurs bords pour les rogner, et vers le haut ou le bas pour changer de piste.", textContent: "Contenu du texte", speed: "Vitesse", animation: "Animation", transition: "Transition", in: "entrée", out: "sortie", durationSeconds: "Durée (s)", transformColor: "Transformation et couleur", colorPreset: "Préréglage de couleur", custom: "Personnalisé", keyframeEasing: "Interpolation de l’image clé", delete: "Supprimer", previousKeyframe: "Image clé précédente", nextKeyframe: "Image clé suivante", removeKeyframe: "Supprimer l’image clé", addKeyframe: "Ajouter une image clé", keyAllProperties: "Animer toutes les propriétés", undoTitle: "Annuler (Ctrl+Z)", redoTitle: "Rétablir (Ctrl+Maj+Z / Ctrl+Y)", splitTitle: "Diviser à la tête de lecture (S)", deleteTitle: "Supprimer", split: "Diviser", play: "Lecture", pause: "Pause", playPauseTitle: "Lecture / pause (Espace)", zoom: "Zoom", zoomOut: "Zoom arrière", zoomIn: "Zoom avant", resetZoom: "Réinitialiser le zoom", reset: "Réinitialiser", jumpKeyframe: "Aller à l’image clé",
  positionX: "Position X", positionY: "Position Y", scale: "Échelle", rotation: "Rotation", opacity: "Opacité", volume: "Volume", brightness: "Luminosité", contrast: "Contraste", saturation: "Saturation", warmth: "Chaleur", hue: "Teinte",
  transNone: "Aucune", transFade: "Fondu", transSlide: "Glissement", transWipe: "Balayage", transZoom: "Zoom", transRise: "Montée", transBounce: "Rebond", transTypewriter: "Machine à écrire", easingLinear: "Linéaire", easingSineIn: "Sinus en entrée", easingSineOut: "Sinus en sortie", easingSineInOut: "Sinus entrée/sortie", easingSmooth: "Fluide", presetOriginal: "Original", presetWarm: "Chaud cinématographique", presetTeal: "Sarcelle et orange", presetVintage: "Années 90 rétro", presetNoir: "Film noir N&B", presetVibrant: "Pop éclatant", presetCool: "Cyberpunk froid",
  font: "Police", fontSize: "Taille de police", bold: "Gras", italic: "Italique", underline: "Souligné", shadow: "Ombre", fill: "Remplissage", fillColor: "Couleur de remplissage", stroke: "Contour", strokeColor: "Couleur du contour", strokeWidth: "Épaisseur du contour", background: "Arrière-plan", backgroundColor: "Couleur d’arrière-plan", glow: "Halo", glowColor: "Couleur du halo", glowStrength: "Intensité du halo",
  importSubtitles: "Importer des sous-titres", addSubtitle: "Ajouter un sous-titre", newSubtitle: "Nouveau sous-titre", noSubtitleTimings: "Aucun minutage de sous-titre trouvé dans ce fichier.", subtitleReadError: "Impossible de lire ce fichier de sous-titres.", burnSubtitles: "Incruster les sous-titres dans la vidéo", bottomMargin: "Marge inférieure (%)", subtitleBottomMargin: "Marge inférieure des sous-titres", subtitleExportFormat: "Format d’exportation des sous-titres", styledAss: "ASS (stylisé)", deleteSubtitle: "Supprimer le sous-titre {index}", subtitleField: "Sous-titre {index} : {field}", start: "début", end: "fin",
};

const zh: Dictionary = {
  importMedia: "导入媒体", importMediaTitle: "将视频、照片或音频导入剪辑", text: "文本", addText: "添加文本", subtitles: "字幕", openClipline: "打开 .clipline", openProjectTitle: "打开已保存的 .clipline 或旧版 .cutline 项目（Ctrl+O）", help: "帮助", helpTitle: "Clipline 帮助", newProject: "新建项目", newProjectTitle: "新建项目——清除浏览器草稿", save: "保存", saveProjectTitle: "保存项目（Ctrl+S）", aspectRatio: "画面比例", canvasAspectRatio: "画布宽高比", exportResolution: "导出分辨率", exportFormat: "导出格式", auto: "自动", unsupported: "不支持", exporting: "正在导出 {progress}%", export: "导出", language: "语言", startNewProject: "开始新项目？", newProjectDescription: "这将删除当前浏览器草稿及其中缓存的媒体。如果要保留此剪辑，请先下载 .clipline 文件。", cancel: "取消", startFresh: "全新开始",
  restoringDraft: "正在恢复草稿…", savedBrowser: "已保存到浏览器", noDraft: "暂无草稿", autosaveUnavailable: "自动保存不可用", draftOpenError: "无法打开之前的浏览器草稿。请保存 .clipline 文件以保留新的编辑。", saving: "正在保存…", autosaveFailed: "自动保存失败", draftSaveError: "浏览器存储空间已满或不可用。请保存 .clipline 文件以保留编辑。", draftClearError: "无法清除浏览器草稿。当前编辑已保留。", couldntImport: "无法导入：{files}", unsupportedFile: "此浏览器无法读取该文件格式。", defaultText: "你的文本", openConfirm: "打开另一个项目？未保存的更改将丢失。", invalidProject: "该文件不是 Clipline 项目。", exportUnsupported: "此浏览器无法录制视频导出。",
  cliplineHelp: "Clipline 帮助", helpDescription: "编辑、项目文件和键盘快捷键。", mediaProjectFiles: "媒体和项目文件", helpImportMedia: "“导入媒体”可将视频、照片或音频添加到时间线。", helpOpenProject: "“打开 .clipline”可恢复已保存的剪辑，包括媒体和设置。旧版 .cutline 项目同样可用。", helpSaveExport: "“保存”会下载可编辑的 .clipline 项目。“导出”会生成成品视频。编辑内容和媒体会自动保存在此浏览器中，并在你返回时恢复。清除浏览器数据会删除草稿；请保存文件作为永久备份。“新建项目”会清除浏览器草稿。", editingTextGlow: "编辑和文本发光", helpTimeline: "拖动时间线片段可移动，拖动边缘可修剪，上下拖动可更改轨道。选择片段可更改其属性。", helpPreview: "暂停时，在预览中拖动文本、视频或照片即可移动。拖动选区下方的旋转按钮可旋转；按住 Shift 可吸附角度。向外拖动调整大小按钮可放大，向内拖动可缩小。", helpGlowKeyframes: "选中文本，在“属性”中开启“发光”，然后选择颜色和强度。使用时间线上方的菱形按钮可一次性为所有属性添加关键帧。在新时间更改多个属性或拖动预览即可制作动画，并选择缓动方式来调整运动。箭头可在关键帧之间跳转。“字幕”选项卡可添加定时字幕，将字幕烧录到导出视频中，并导出 SRT、VTT 或带样式的 ASS 文件。", keyboardShortcuts: "键盘快捷键", playPause: "播放 / 暂停", stepFrame: "逐帧步进（暂停时）", splitPlayhead: "在播放头处分割", deleteSelection: "删除所选内容", undo: "撤销", redo: "重做", redoAlternative: "重做（备用）", saveProject: "保存项目", openProject: "打开项目", spaceKey: "空格键", deleteKey: "Delete 键",
  videoPreview: "视频预览", rotateSelection: "旋转所选内容", dragRotate: "拖动以旋转", resizeSelection: "调整所选内容大小", dragResize: "拖动以调整大小", emptyPreview: "导入视频、照片或音频即可开始编辑", audioWaveform: "音频波形", editorPanels: "编辑器面板", properties: "属性", selectSomething: "在时间线上选择内容。拖动项目可移动，拖动边缘可修剪，上下拖动可更改轨道。", textContent: "文本内容", speed: "速度", animation: "动画", transition: "转场", in: "入场", out: "出场", durationSeconds: "时长（秒）", transformColor: "变换和颜色", colorPreset: "颜色预设", custom: "自定义", keyframeEasing: "关键帧缓动", delete: "删除", previousKeyframe: "上一个关键帧", nextKeyframe: "下一个关键帧", removeKeyframe: "删除关键帧", addKeyframe: "添加关键帧", keyAllProperties: "为所有属性添加关键帧", undoTitle: "撤销（Ctrl+Z）", redoTitle: "重做（Ctrl+Shift+Z / Ctrl+Y）", splitTitle: "在播放头处分割（S）", deleteTitle: "删除", split: "分割", play: "播放", pause: "暂停", playPauseTitle: "播放 / 暂停（空格键）", zoom: "缩放", zoomOut: "缩小", zoomIn: "放大", resetZoom: "重置缩放", reset: "重置", jumpKeyframe: "跳转到关键帧",
  positionX: "X 位置", positionY: "Y 位置", scale: "缩放", rotation: "旋转", opacity: "不透明度", volume: "音量", brightness: "亮度", contrast: "对比度", saturation: "饱和度", warmth: "色温", hue: "色相",
  transNone: "无", transFade: "淡入淡出", transSlide: "滑动", transWipe: "擦除", transZoom: "缩放", transRise: "上升", transBounce: "弹跳", transTypewriter: "打字机", easingLinear: "线性", easingSineIn: "正弦缓入", easingSineOut: "正弦缓出", easingSineInOut: "正弦缓入缓出", easingSmooth: "平滑", presetOriginal: "原始", presetWarm: "电影暖色", presetTeal: "青橙色调", presetVintage: "复古九十年代", presetNoir: "黑白黑色电影", presetVibrant: "鲜艳流行", presetCool: "冷色赛博朋克",
  font: "字体", fontSize: "字体大小", bold: "粗体", italic: "斜体", underline: "下划线", shadow: "阴影", fill: "填充", fillColor: "填充颜色", stroke: "描边", strokeColor: "描边颜色", strokeWidth: "描边宽度", background: "背景", backgroundColor: "背景颜色", glow: "发光", glowColor: "发光颜色", glowStrength: "发光强度",
  importSubtitles: "导入字幕", addSubtitle: "添加字幕", newSubtitle: "新字幕", noSubtitleTimings: "此文件中未找到字幕时间码。", subtitleReadError: "无法读取此字幕文件。", burnSubtitles: "将字幕烧录到视频中", bottomMargin: "下边距（%）", subtitleBottomMargin: "字幕下边距", subtitleExportFormat: "字幕导出格式", styledAss: "ASS（带样式）", deleteSubtitle: "删除字幕 {index}", subtitleField: "字幕 {index}{field}", start: "开始", end: "结束",
};

const ja: Dictionary = {
  importMedia: "メディアを読み込む", importMediaTitle: "動画、写真、音声を編集に読み込みます", text: "テキスト", addText: "テキストを追加", subtitles: "字幕", openClipline: ".clipline を開く", openProjectTitle: "保存済みの .clipline または旧形式の .cutline プロジェクトを開く（Ctrl+O）", help: "ヘルプ", helpTitle: "Clipline ヘルプ", newProject: "新規プロジェクト", newProjectTitle: "新規プロジェクト — ブラウザーの下書きを消去", save: "保存", saveProjectTitle: "プロジェクトを保存（Ctrl+S）", aspectRatio: "アスペクト比", canvasAspectRatio: "キャンバスのアスペクト比", exportResolution: "書き出し解像度", exportFormat: "書き出し形式", auto: "自動", unsupported: "非対応", exporting: "書き出し中 {progress}%", export: "書き出し", language: "言語", startNewProject: "新しいプロジェクトを開始しますか？", newProjectDescription: "現在のブラウザーの下書きとキャッシュされたメディアを削除します。この編集を残す場合は、先に .clipline ファイルをダウンロードしてください。", cancel: "キャンセル", startFresh: "最初から開始",
  restoringDraft: "下書きを復元中…", savedBrowser: "ブラウザーに保存済み", noDraft: "下書きはありません", autosaveUnavailable: "自動保存を利用できません", draftOpenError: "以前のブラウザーの下書きを開けませんでした。新しい編集を残すには .clipline ファイルを保存してください。", saving: "保存中…", autosaveFailed: "自動保存に失敗しました", draftSaveError: "ブラウザーのストレージがいっぱいか、利用できません。編集を残すには .clipline ファイルを保存してください。", draftClearError: "ブラウザーの下書きを消去できませんでした。現在の編集は保持されています。", couldntImport: "読み込めませんでした：{files}", unsupportedFile: "このブラウザーではそのファイル形式を読み込めません。", defaultText: "テキストを入力", openConfirm: "別のプロジェクトを開きますか？保存していない変更は失われます。", invalidProject: "このファイルは Clipline プロジェクトではありません。", exportUnsupported: "このブラウザーでは動画の書き出しを録画できません。",
  cliplineHelp: "Clipline ヘルプ", helpDescription: "編集、プロジェクトファイル、キーボードショートカット。", mediaProjectFiles: "メディアとプロジェクトファイル", helpImportMedia: "「メディアを読み込む」では、動画、写真、音声をタイムラインに追加します。", helpOpenProject: "「.clipline を開く」では、メディアと設定を含む保存済みの編集を復元します。旧形式の .cutline プロジェクトも利用できます。", helpSaveExport: "「保存」は編集可能な .clipline プロジェクトをダウンロードします。「書き出し」は完成した動画を作成します。編集とメディアはこのブラウザーに自動保存され、戻ったときに復元されます。ブラウザーデータを消去すると下書きも削除されるため、永続的なバックアップにはファイルを保存してください。「新規プロジェクト」はブラウザーの下書きを消去します。", editingTextGlow: "編集とテキストのグロー", helpTimeline: "タイムラインのクリップをドラッグして移動し、端をドラッグしてトリミングし、上下にドラッグしてトラックを変更します。クリップを選択するとプロパティを変更できます。", helpPreview: "一時停止中は、プレビュー内のテキスト、動画、写真をドラッグして移動できます。選択範囲の下にある回転ボタンをドラッグすると回転し、Shift を押すと角度にスナップします。サイズ変更ボタンを外側へドラッグすると拡大し、内側へドラッグすると縮小します。", helpGlowKeyframes: "テキストを選択し、「プロパティ」で「グロー」をオンにして、色と強さを選びます。タイムライン上のひし形ボタンで、すべてのプロパティに一度にキーフレームを設定できます。別の時間で複数のプロパティを変更するかプレビューをドラッグしてアニメーション化し、イージングで動きを調整します。矢印でキーフレーム間を移動します。「字幕」タブでは、時間指定の字幕を追加し、書き出す動画に焼き付け、SRT、VTT、スタイル付き ASS ファイルとして書き出せます。", keyboardShortcuts: "キーボードショートカット", playPause: "再生 / 一時停止", stepFrame: "1 フレーム移動（一時停止中）", splitPlayhead: "再生ヘッドで分割", deleteSelection: "選択範囲を削除", undo: "元に戻す", redo: "やり直す", redoAlternative: "やり直す（別の操作）", saveProject: "プロジェクトを保存", openProject: "プロジェクトを開く", spaceKey: "スペース", deleteKey: "Delete",
  videoPreview: "動画プレビュー", rotateSelection: "選択範囲を回転", dragRotate: "ドラッグして回転", resizeSelection: "選択範囲のサイズを変更", dragResize: "ドラッグしてサイズ変更", emptyPreview: "動画、写真、音声を読み込んで編集を開始", audioWaveform: "音声波形", editorPanels: "エディターパネル", properties: "プロパティ", selectSomething: "タイムラインで項目を選択してください。項目をドラッグして移動し、端をドラッグしてトリミングし、上下にドラッグしてトラックを変更できます。", textContent: "テキスト内容", speed: "速度", animation: "アニメーション", transition: "トランジション", in: "イン", out: "アウト", durationSeconds: "長さ（秒）", transformColor: "変形とカラー", colorPreset: "カラープリセット", custom: "カスタム", keyframeEasing: "キーフレームのイージング", delete: "削除", previousKeyframe: "前のキーフレーム", nextKeyframe: "次のキーフレーム", removeKeyframe: "キーフレームを削除", addKeyframe: "キーフレームを追加", keyAllProperties: "すべてのプロパティにキーフレームを設定", undoTitle: "元に戻す（Ctrl+Z）", redoTitle: "やり直す（Ctrl+Shift+Z / Ctrl+Y）", splitTitle: "再生ヘッドで分割（S）", deleteTitle: "削除", split: "分割", play: "再生", pause: "一時停止", playPauseTitle: "再生 / 一時停止（スペース）", zoom: "ズーム", zoomOut: "ズームアウト", zoomIn: "ズームイン", resetZoom: "ズームをリセット", reset: "リセット", jumpKeyframe: "キーフレームへ移動",
  positionX: "X 位置", positionY: "Y 位置", scale: "拡大縮小", rotation: "回転", opacity: "不透明度", volume: "音量", brightness: "明るさ", contrast: "コントラスト", saturation: "彩度", warmth: "暖かさ", hue: "色相",
  transNone: "なし", transFade: "フェード", transSlide: "スライド", transWipe: "ワイプ", transZoom: "ズーム", transRise: "ライズ", transBounce: "バウンス", transTypewriter: "タイプライター", easingLinear: "リニア", easingSineIn: "サインイン", easingSineOut: "サインアウト", easingSineInOut: "サインイン／アウト", easingSmooth: "スムーズ", presetOriginal: "オリジナル", presetWarm: "シネマティックウォーム", presetTeal: "ティール＆オレンジ", presetVintage: "90年代ヴィンテージ", presetNoir: "白黒フィルムノワール", presetVibrant: "鮮やかなポップ", presetCool: "クールサイバーパンク",
  font: "フォント", fontSize: "フォントサイズ", bold: "太字", italic: "斜体", underline: "下線", shadow: "シャドウ", fill: "塗りつぶし", fillColor: "塗りつぶしの色", stroke: "輪郭", strokeColor: "輪郭の色", strokeWidth: "輪郭の幅", background: "背景", backgroundColor: "背景色", glow: "グロー", glowColor: "グローの色", glowStrength: "グローの強さ",
  importSubtitles: "字幕を読み込む", addSubtitle: "字幕を追加", newSubtitle: "新しい字幕", noSubtitleTimings: "このファイルに字幕のタイミングが見つかりませんでした。", subtitleReadError: "この字幕ファイルを読み込めませんでした。", burnSubtitles: "字幕を動画に焼き付ける", bottomMargin: "下余白（%）", subtitleBottomMargin: "字幕の下余白", subtitleExportFormat: "字幕の書き出し形式", styledAss: "ASS（スタイル付き）", deleteSubtitle: "字幕 {index} を削除", subtitleField: "字幕 {index} {field}", start: "開始", end: "終了",
};

export const translations: Record<Locale, Dictionary> = { en, es, fr, zh, ja };
type Vars = Record<string, string | number>;
export function translate(locale: Locale, key: TranslationKey, vars: Vars = {}) {
  return Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), translations[locale][key]);
}

type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: TranslationKey, vars?: Vars) => string };
const I18nContext = createContext<I18nValue | null>(null);
const STORAGE_KEY = "clipline-language";
const isLocale = (value: string | null): value is Locale => LANGUAGES.some((language) => language.value === value);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const browser = navigator.language.toLowerCase().split("-")[0] ?? "en";
    setLocaleState(isLocale(saved) ? saved : isLocale(browser) ? browser : "en");
  }, []);
  useEffect(() => { document.documentElement.lang = locale === "zh" ? "zh-Hans" : locale; }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);
  const t = useCallback((key: TranslationKey, vars?: Vars) => translate(locale, key, vars), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
