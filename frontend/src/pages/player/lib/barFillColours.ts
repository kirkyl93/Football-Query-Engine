import {getClubColours} from "../../../lib/ClubDirectory";
import {colourDistance} from "../../../lib/ColourUtils";
import {PlayerAppearance} from "../../../types/Player";

/** Two fills closer than this count as "the same colour" for clash purposes. */
export const BAR_FILL_CLASH_THRESHOLD = 80;

/**
 * One solid fill per appearance, in game order.
 *
 * - Same club as the previous game keeps the previous fill, so a spell at one
 *   club renders as a stable colour band.
 * - A new club starts on its dominant (primary) colour, unless that is
 *   visually similar to the previous bar — then the first sufficiently
 *   different secondary/tertiary colour is used instead, so team switches
 *   are obvious even between similarly-dressed clubs.
 * - If every club colour clashes, the most-distant one wins.
 */
export function resolveBarFills(appearances: PlayerAppearance[]): string[] {
    const fills: string[] = [];

    appearances.forEach((appearance, index) => {
        const colours = getClubColours(appearance.club_id);
        const previousFill = index > 0 ? fills[index - 1] : null;
        const previousClub = index > 0 ? appearances[index - 1].club_id : null;

        if (previousFill !== null && appearance.club_id === previousClub) {
            fills.push(previousFill);
            return;
        }
        if (previousFill === null) {
            fills.push(colours[0]);
            return;
        }
        const distinct = colours.find(
            (colour) => colourDistance(colour, previousFill) >= BAR_FILL_CLASH_THRESHOLD,
        );
        if (distinct !== undefined) {
            fills.push(distinct);
            return;
        }
        let best = colours[0];
        let bestDistance = -1;
        for (const colour of colours) {
            const distance = colourDistance(colour, previousFill);
            if (distance > bestDistance) {
                bestDistance = distance;
                best = colour;
            }
        }
        fills.push(best);
    });

    return fills;
}
