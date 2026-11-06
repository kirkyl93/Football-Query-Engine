import {getClubName} from '../../../lib/ClubDirectory';
import shared from '../../../styles/shared.module.css';

export function ClubBadge({clubId, name}: {clubId: number | string; name?: string}) {
    const id = typeof clubId === 'string' ? clubId.trim() : clubId;
    const clubName = name ?? getClubName(id);
    return <img
        src={`https://tmssl.akamaized.net/images/wappen/head/${encodeURIComponent(id)}.png`}
        alt={clubName}
        title={clubName}
        className={shared['club-badge']}
        width={38}
        height={38}
        loading="lazy"
        decoding="async"
    />;
}
