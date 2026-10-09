import React from "react";
import {EventType} from "../../../../types/Player";
import {eventTypeOptions} from "../../lib/appearancesFilterOptions";
import {EventSelection} from "../../lib/appearancesEventMapper";
import FilterSection from "../../../../components/FilterSection";
import shared from '../../../../styles/shared.module.css';

interface EventsSectionProps {
    selectedEvents: EventSelection;
    onEventSelectionChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const EventsSection: React.FC<EventsSectionProps> = ({selectedEvents, onEventSelectionChange}) => {
    return (
        <FilterSection title="EVENTS">
            <div className={shared['checkbox-group-vertical']}>
                {eventTypeOptions.map(event => (
                    <label className="club-label" key={event.eventType}>
                        <input
                            type="checkbox"
                            value={event.eventType}
                            checked={selectedEvents[event.eventType]}
                            onChange={onEventSelectionChange}
                        />
                        {event.eventType !== EventType.CleanSheets ?
                            <span className={shared['square']} style={{backgroundColor: event.colour}}></span> :
                            <img
                                src={'/light-bulb.png'}
                                alt={`Light bulb`}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    verticalAlign: 'middle',
                                    marginLeft: '-3.8px',
                                    marginTop: '-2px'
                                }}
                            />
                        }
                        {event.name}
                    </label>
                ))}
            </div>
        </FilterSection>
    );
};

export default EventsSection;
