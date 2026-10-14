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
