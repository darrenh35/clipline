<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep keyframe interpolation in the shared easing module so preview and export use identical animation curves; missing easing retains legacy smooth motion.
- Store easing on the outgoing keyframe, and preserve it when changing its value so direct preview edits do not reset animation curves.
- Save Clipline projects with the new identity while accepting legacy Cutline projects so existing edits remain usable.
- Render optional text glow in the shared canvas draw pipeline and store its settings on text styles so saved projects, previews, and exports stay consistent without changing legacy text.
- Direct preview resizing updates the existing scale property through the keyframe-aware setter; keep resize math in the shared preview-transform helper so saved edits and exports use the same transforms.
- Browser drafts use a serialized IndexedDB transaction for document and immutable media blobs; restore before enabling edits and never overwrite a draft after a failed read, keeping autosave local and race-safe.
- Master keyframes operate on the existing per-property keyframe arrays through a shared helper, preserving legacy animation and outgoing easing.
- Store subtitle cues and styles in the project document, and burn them through the shared canvas renderer so autosave, project files, preview, and video export agree.
- Share compact text styling controls between text overlays and subtitles to keep editing consistent.
