/**
 * SketchFilters — Hidden SVG filter definitions.
 *
 * Renders an invisible <svg> that contains the feTurbulence
 * filter used by `.sketch-border` and other sketch utilities.
 * Mount this once at the root layout so every page can reference
 * the filter via `filter: url(#sketchy)`.
 */
export default function SketchFilters() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <filter id="sketchy" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.03"
            numOctaves="3"
            seed="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
