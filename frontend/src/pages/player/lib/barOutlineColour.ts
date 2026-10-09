import {PlayerAppearance} from "../../../types/Player";

/** Bar outline colour by competition (moved out of AppearancesChart). */
export const getBarOutlineColour = (appearance: PlayerAppearance): string => {
    if (appearance.competition_type === 'League') {
        return 'black';
    }

    if (appearance.competition_type === 'Europe') {
        switch (appearance.competition_name) {
            case 'Champions League':
                return '#FFBF00'
            case 'Europa League':
                return 'silver'
            case 'Europa Conference League':
                return 'bronze'
        }
    }

    if (appearance.competition_type === 'Domestic Cup') {
        return 'red';
    }

    return 'black';
};
