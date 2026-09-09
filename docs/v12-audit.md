# v12 audit and implementation

Baseline: `main` commit `f06453e1f393ebce1f929503fa9ac261e6634f51` (public shell v11).

## Actual deployed dependency chain

`index.html` loaded `style-v9.css`, Three.js r160 from jsDelivr, then `v9-1.js` through `v9-7.js`, then `v10-patch.js`. All scripts shared global lexical state. The last file contained **v11**, despite its v10 filename. `v9-7.js` initialized the scene and started the main animation loop before the patch ran.

- v9-1: state, world, renderer and particles.
- v9-2: camp, audio, labels and outposts.
- v9-3: duplicate outpost definitions, defenses, upgrades.
- v9-4: building, workers and player visuals.
- v9-5: enemy visuals/spawning and input.
- v9-6: collision, labels, resources and the entire simulation update.
- v9-7: game phases, HUD, effects, startup and debug globals.
- v10-patch: injected CSS, replaced functions, HUD polling, construction and a separate enemy-death polling loop.

v10 was attempted using `v10-1.js`–`v10-4.js` and then rolled back to v9 (`0fb938a`). `4214806` added the feedback patch; `f2e1295` enabled it. `c86e271` replaced that patch with v11; `f06453e` changed the shell title. `chunk*.js`, `v10-*.js` other than the patch, and `style.css`/`style-v10.css` were not loaded by the final v11 shell. They are removed from the working tree; Git history preserves them.

## Findings and action

| Finding                                     | Evidence in v11                                                               | v12 treatment                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| HUD relies on patch executing successfully  | CSS injection and independent `hudWatch` RAF                                  | Static stylesheet; start/retry own visibility; one loop                      |
| Blurred HUD still present                   | `.chip` inherits `backdrop-filter:blur(6px)`                                  | Remove blur; opaque chip backgrounds and explicit layer order                |
| Ground rings hidden under snow              | Snow top y=.5; ring/tag y≈.08                                                 | Rings at y>.5; no CanvasTexture labels                                       |
| Dense labels cover playfield                | Every projected tag appears, including far away tags                          | Near labels only, screen-edge/HUD clipping and overlap culling; rings remain |
| Rebuild label immediately overwritten       | removeBlock sets “再建”, next update writes normal title                      | Rebuilding state drives label until completion                               |
| Missing material shown as affordable        | Forced `groundHud ready` on destruction                                       | Resource checks; only missing costs red                                      |
| Unlock requirements not enforced            | Both old and patched building loops omit `requiredBaseLevel`                  | Validate inside construction entry point                                     |
| Player still pushed from long walls         | Completion waits for radius 1.35; collision uses wall half-length 1.52+radius | One exact footprint predicate shared by completion and player collision      |
| Retry retains active construction           | Patch-local `sites` never cleared                                             | Reset construction and dispose models before reset                           |
| Retry retains upgraded camp meshes          | `fireGroup.userData={}` loses model handles without removing children         | Dispose upgrade groups before clearing metadata                              |
| Pickup effect allocates every frame         | `box()` and `setTimeout(...,34)` per particle/frame; no dispose               | Up to 128 reusable meshes, cached materials, moving player target            |
| Death detection polls entire enemy list     | Separate RAF Map snapshots; cleanup can look like a kill                      | Effect emitted directly on death; up to 24 short-lived models                |
| Harvest repeatedly rebuilds instance buffer | Each removed voxel rebuilds all blocks                                        | Resource deletion transaction; GPU buffer flush once per frame               |
| Detached models retain GPU resources        | Mostly `scene.remove` without disposal                                        | Dispose owned geometry/material on destruction, upgrade and reset            |
| Input can remain active after interruption  | No blur/lost capture/visibility reset                                         | Pointer ownership and lifecycle resets; pause simulation while hidden        |
| Breaker damages camp near its wall target   | d<1.8 branch treats all non-outpost targets as central camp                   | Route wall target through defense attack path                                |
| Repeatable capture rewards                  | Research/survivor reward applied each recapture                               | Once per outpost per run                                                     |
| Warehouse bonus survives destruction        | No reduction on removeBlock                                                   | Remove this warehouse's contribution; account for bonus upgrade too          |
| Startup failure leaves inert start button   | WebGL init throws before button handlers                                      | Visible error and disabled start button                                      |

## Blue lower-half issue: what is and is not established

The exact iPhone Safari artifact has **not** been reproduced. No claim that a specific WebKit defect caused it or that v12 conclusively fixes it is justified.

Candidates: DOM compositing (blur/transparent layers), stale or conflicting input overlay code, transparent world geometry, viewport/backing-canvas mismatch during Safari chrome changes, WebGL context loss. The v11 renderer already used the default opaque canvas; `alpha:false` in v12 makes that existing intent explicit, rather than claiming a newly changed transparency mode. The snow/ring height mismatch is a confirmed visibility bug, not proof of the lower-half blue artifact.

v12 removes joyZone from the DOM entirely, removes backdrop blur and CanvasTexture labels, gives only the game canvas fixed positioning, fixes stacking, listens for viewport resize and WebGL loss/restoration. Tests in `docs/iphone-test.md` are still required.

## Scope and remaining issues

Balance constants, starting resources, day/night lengths, enemy HP/speed/damage, spawn counts, costs and Day7 boss values are preserved. Exploit fixes and unlocking enforcement can affect experienced difficulty; user playtesting must validate it. Movement remains the only continuous gameplay input. Existing between-night choice cards remain.

This is a staged refactor: functions are now single-definition source systems, bundled inside one private closure. Shared mutable state still lives in `src/state.js`; this is **not** a full independent ES-module/entity-system rewrite. The build order is explicit in `scripts/build.mjs`. Next extraction can introduce typed state/interfaces after this baseline is validated.

The `thrower` type has distinct HP/speed but still uses the common close-range attack logic; implementing true ranged attacks is deferred to avoid silently changing gameplay. Research buffs remain after losing the post (existing behavior), with repeat capture stacking removed. Dense voxel art, more elaborate tower assembly, and hitstop are deferred. Base level-up retains its existing chime/banner; no large shake or forced movement is added.

## Verification limits

Automated tests use real Three.js math/meshes/scene and deterministic simulation, but stub DOM and GPU I/O. They test logic, not rendered pixels. The available cloud Chrome reports WebGL disabled; the current v11 itself fails to create a context there. Physical iPhone Safari, touch feel, sustained frame rate and blue-overlay reproduction remain manual gates. Do not describe v12 as physically device-tested.
