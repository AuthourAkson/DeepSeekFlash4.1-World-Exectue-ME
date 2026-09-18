# Gender Gauge SVG Asset Pack

These SVGs are reconstructed as editable vector assets from the supplied reference screenshots.
They are intentionally separated into reusable pieces so an Agent can integrate them into HTML/CSS/JS.

Files:
- gender_symbol.svg              Combined female + male symbol
- configuration.svg              "Configuration" label
- switch_my_gender.svg            Intro title and side symbols
- gauge_base.svg                 Rings + tick marks + center symbol
- gauge_0.svg                    Gauge at 0%
- gauge_50.svg                   Gauge at 50%
- gauge_100.svg                  Gauge at 100%
- from_F_to_M_animation_template.svg
                                  Full-screen animation-ready SVG template

Animation concept:
1. Intro title / side symbols.
2. Side symbols merge into the center.
3. Concentric rings expand from the center.
4. Gauge/ticks appear.
5. Needle reaches 100%.
6. On lyric "F", interpolate needle/value to 50%.
7. On lyric "M", interpolate needle/value back to 100%.

Important:
The exact screenshot contains rasterized/scanline artifacts. The SVGs keep the geometry as clean vectors;
the dark blue background and white/gray hierarchy are approximated so they can be recolored easily.

The main animation template exposes:
- #needle       -> rotate around the gauge center
- #percentage   -> change text from 0% / 50% / 100%
- #ripple-rings -> animate opacity/radius for the expanding circles
