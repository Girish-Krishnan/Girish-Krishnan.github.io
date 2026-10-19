import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

/** Post-processing, lazy-loaded after the scene is up so it never blocks first render. */
export default function Effects({ msaa }: { msaa: number }) {
  return (
    <EffectComposer multisampling={msaa}>
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
      <Vignette offset={0.25} darkness={0.65} />
    </EffectComposer>
  )
}
