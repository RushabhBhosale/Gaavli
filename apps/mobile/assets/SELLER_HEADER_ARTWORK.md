# Seller Products header artwork

`seller-products-header.png` is a project-local illustration recreated from the
user's supplied seller Products header reference with the built-in image_gen tool
on 2026-10-21. It replaces the earlier native-shape approximation. The original
generated file remains in the tool's generated_images directory. No UI text or
sample metrics are baked into this image; React Native renders real controls and
account-specific data above/below the decorative scene.

Final generation prompt (the supplied screenshot was the reference image):

> Create ONLY the decorative farm illustration asset from the top RIGHT of the
> supplied Gaavli mobile UI reference, as closely matching that scene as possible.
> Do not recreate the UI, text, icons, statistics, tabs, borders or search box.
> Wide landscape 3:2 illustration: foreground at the right a light honey-brown
> wooden slatted vegetable crate filled with leafy spinach greens, orange carrots
> and red tomatoes, behind it soft green trees and tiny cream village houses with
> terracotta roofs. Distant pale green rolling farm hills fade to the left into
> solid warm cream #FFFDF7 background. Soft hand-painted polished flat illustration
> with gentle shading, exactly the warm cream, yellow and soft green visual
> character of the reference. Composition has crate in lower right, houses on far
> right, upper leaf clusters, open cream negative space at left; entire crate
> visible, no cut-off produce. No lettering, no watermark. This is a reusable
> image asset for the right side of the actual app header.

The image is decorative, hidden from accessibility and bundled locally for
offline rendering. Its display frame positions the farm/crate at the header's
right edge while reserving room for localized, wrapping title/subtitle text.
