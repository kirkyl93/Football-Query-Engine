use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Competition {
    #[serde(rename = "Jupiler Pro League")]
    BelgianLeague,
    #[serde(rename = "Belgian Super Cup")]
    BelgianSuperCup,
    #[serde(rename = "Copa Del Rey")]
    CopaDelRey,
    #[serde(rename = "League Cup")]
    EFLCup,
    #[serde(rename = "Coppa Italia")]
    ItalyCup,
    #[serde(rename = "Champions League")]
    ChampionsLeague,
    #[serde(rename = "Champions League Qualification")]
    ChampionsLeagueQualification,
    #[serde(rename = "DFB Pokal")]
    DFBPokal,
    #[serde(rename = "DFL Super Cup")]
    DFLSuperCup,
    Superligaen,
    #[serde(rename = "Sydbank Pokalen")]
    SydbankPokalen,
    #[serde(rename = "Europa Conference League Qualification")]
    EuropaConferenceLeagueQualification,
    #[serde(rename = "Europa League")]
    EuropaLeague,
    #[serde(rename = "Europa League Qualification")]
    EuropaLeagueQualification,
    #[serde(rename = "La Liga")]
    LaLiga,
    #[serde(rename = "FA Cup")]
    FACup,
    #[serde(rename = "Ligue 1")]
    Ligue1,
    #[serde(rename = "Trophes des Champions")]
    TrophesDesChampions,
    #[serde(rename = "Premier League")]
    PremierLeague,
    #[serde(rename = "Community Shield")]
    CommunityShield,
    #[serde(rename = "Super League 1")]
    SuperLeague1,
    #[serde(rename = "Kypello Elladas")]
    KypelloElladas,
    #[serde(rename = "Serie A")]
    SerieA,
    #[serde(rename = "FIFA Klub WM")]
    FIFAKlubWM,
    #[serde(rename = "Bundesliga")]
    Bundesliga,
    #[serde(rename = "Eredivisie")]
    Eredivisie,
    #[serde(rename = "Toto KNVB Beker")]
    TotoKNVBBeker,
    #[serde(rename = "Johan Cruijff Schaal")]
    JohanCruijffSchaal,
    #[serde(rename = "Liga Portugal Bwin")]
    LigaPortugalBwin,
    #[serde(rename = "Allianz Cup")]
    AllianzCup,
    #[serde(rename = "Supertaca Candido de Oliveira")]
    SupertacaCandidoDeOliveira,
    #[serde(rename = "Premier Liga")]
    PremierLiga,
    #[serde(rename = "Russian Cup")]
    RussianCup,
    #[serde(rename = "Russian Super Cup")]
    RussianSuperCup,
    #[serde(rename = "Scottish Premiership")]
    ScottishPremiership,
    #[serde(rename = "Supercoppa Italiana")]
    SupercoppaItaliana,
    #[serde(rename = "SFA Cup")]
    SFACup,
    #[serde(rename = "Supercopa")]
    Supercopa,
    #[serde(rename = "Super Lig")]
    SuperLig,
    #[serde(rename = "UEFA Conference League")]
    UEFAConferenceLeague,
    #[serde(rename = "Ukrainian Cup")]
    UkrainianCup,
    #[serde(rename = "Ukrainian Super Cup")]
    UkrainianSuperCup,
    #[serde(rename = "UEFA Super Cup")]
    UEFASuperCup,
    Missing,
}

impl Competition {
    pub fn from_str(s: &str) -> Self {
        match s {
            "jupiler-pro-league" => Competition::BelgianLeague,
            "belgian-supercup" => Competition::BelgianSuperCup,
            "copa-del-rey" => Competition::CopaDelRey,
            "efl-cup" => Competition::EFLCup,
            "italy-cup" => Competition::ItalyCup,
            "uefa-champions-league" => Competition::ChampionsLeague,
            "uefa-champions-league-qualifikation" => Competition::ChampionsLeagueQualification,
            "dfb-pokal" => Competition::DFBPokal,
            "dfl-supercup" => Competition::DFLSuperCup,
            "superligaen" => Competition::Superligaen,
            "sydbank-pokalen" => Competition::SydbankPokalen,
            "uefa-europa-conference-league-qualifikation" => Competition::EuropaConferenceLeagueQualification,
            "europa-league" => Competition::EuropaLeague,
            "europa-league-qualifikation" => Competition::EuropaLeagueQualification,
            "laliga" => Competition::LaLiga,
            "fa-cup" => Competition::FACup,
            "ligue-1" => Competition::Ligue1,
            "trophee-des-champions" => Competition::TrophesDesChampions,
            "premier-league" => Competition::PremierLeague,
            "community-shield" => Competition::CommunityShield,
            "super-league-1" => Competition::SuperLeague1,
            "kypello-elladas" => Competition::KypelloElladas,
            "serie-a" => Competition::SerieA,
            "fifa-klub-wm" => Competition::FIFAKlubWM,
            "bundesliga" => Competition::Bundesliga,
            "eredivisie" => Competition::Eredivisie,
            "toto-knvb-beker" => Competition::TotoKNVBBeker,
            "johan-cruijff-schaal" => Competition::JohanCruijffSchaal,
            "liga-portugal-bwin" => Competition::LigaPortugalBwin,
            "allianz-cup" => Competition::AllianzCup,
            "supertaca-candido-de-oliveira" => Competition::SupertacaCandidoDeOliveira,
            "premier-liga" => Competition::PremierLiga,
            "russian-cup" => Competition::RussianCup,
            "russian-super-cup" => Competition::RussianSuperCup,
            "scottish-premiership" => Competition::ScottishPremiership,
            "supercoppa-italiana" => Competition::SupercoppaItaliana,
            "sfa-cup" => Competition::SFACup,
            "supercopa" => Competition::Supercopa,
            "super-lig" => Competition::SuperLig,
            "uefa-conference-league" => Competition::UEFAConferenceLeague,
            "ukrainian-cup" => Competition::UkrainianCup,
            "ukrainian-super-cup" => Competition::UkrainianSuperCup,
            "uefa-super-cup" => Competition::UEFASuperCup,
            _ => Competition::Missing
        }
    }

    pub fn competition_code(&self) -> &'static str {
        match self {
            Competition::BelgianLeague => "BE1",
            Competition::BelgianSuperCup => "BESC",
            Competition::CopaDelRey => "CDR",
            Competition::EFLCup => "CGB",
            Competition::ItalyCup => "CIT",
            Competition::ChampionsLeague => "CL",
            Competition::ChampionsLeagueQualification => "CLQ",
            Competition::DFBPokal => "DFB",
            Competition::DFLSuperCup => "DFL",
            Competition::Superligaen => "DK1",
            Competition::SydbankPokalen => "DKP",
            Competition::EuropaConferenceLeagueQualification => "ECLQ",
            Competition::EuropaLeague => "EL",
            Competition::EuropaLeagueQualification => "ELQ",
            Competition::LaLiga => "ES1",
            Competition::FACup => "FAC",
            Competition::Ligue1 => "FR1",
            Competition::TrophesDesChampions => "FRCH",
            Competition::PremierLeague => "GB1",
            Competition::CommunityShield => "GBCS",
            Competition::SuperLeague1 => "GR1",
            Competition::KypelloElladas => "GRP",
            Competition::SerieA => "IT1",
            Competition::FIFAKlubWM => "KLUB",
            Competition::Bundesliga => "L1",
            Competition::Eredivisie => "NL1",
            Competition::TotoKNVBBeker => "NLP",
            Competition::JohanCruijffSchaal => "NLSC",
            Competition::LigaPortugalBwin => "PO1",
            Competition::AllianzCup => "POCP",
            Competition::SupertacaCandidoDeOliveira => "POSU",
            Competition::PremierLiga => "RU1",
            Competition::RussianCup => "RUP",
            Competition::RussianSuperCup => "RUSS",
            Competition::ScottishPremiership => "SC1",
            Competition::SupercoppaItaliana => "SCI",
            Competition::SFACup => "SFA",
            Competition::Supercopa => "SUC",
            Competition::SuperLig => "TR1",
            Competition::UEFAConferenceLeague => "UCOL",
            Competition::UkrainianCup => "UKRP",
            Competition::UkrainianSuperCup => "UKRS",
            Competition::UEFASuperCup => "USC",
            Competition::Missing => "UNKNOWN",
        }
    }
    pub fn from_code(s: &str) -> Self {
        match s {
            "BE1" => Competition::BelgianLeague,
            "BESC" => Competition::BelgianSuperCup,
            "CDR" => Competition::CopaDelRey,
            "CGB" => Competition::EFLCup,
            "CIT" => Competition::ItalyCup,
            "CL" => Competition::ChampionsLeague,
            "CLQ" => Competition::ChampionsLeagueQualification,
            "DFB" => Competition::DFBPokal,
            "DFL" => Competition::DFLSuperCup,
            "DK1" => Competition::Superligaen,
            "DKP" => Competition::SydbankPokalen,
            "ECLQ" => Competition::EuropaConferenceLeagueQualification,
            "EL" => Competition::EuropaLeague,
            "ELQ" => Competition::EuropaLeagueQualification,
            "ES1" => Competition::LaLiga,
            "FAC" => Competition::FACup,
            "FR1" => Competition::Ligue1,
            "FRCH" => Competition::TrophesDesChampions,
            "GB1" => Competition::PremierLeague,
            "GBCS" => Competition::CommunityShield,
            "GR1" => Competition::SuperLeague1,
            "GRP" => Competition::KypelloElladas,
            "IT1" => Competition::SerieA,
            "KLUB" => Competition::FIFAKlubWM,
            "L1" => Competition::Bundesliga,
            "NL1" => Competition::Eredivisie,
            "NLP" => Competition::TotoKNVBBeker,
            "NLSC" => Competition::JohanCruijffSchaal,
            "PO1" => Competition::LigaPortugalBwin,
            "POCP" => Competition::AllianzCup,
            "POSU" => Competition::SupertacaCandidoDeOliveira,
            "RU1" => Competition::PremierLiga,
            "RUP" => Competition::RussianCup,
            "RUSS" => Competition::RussianSuperCup,
            "SC1" => Competition::ScottishPremiership,
            "SCI" => Competition::SupercoppaItaliana,
            "SFA" => Competition::SFACup,
            "SUC" => Competition::Supercopa,
            "TR1" => Competition::SuperLig,
            "UCOL" => Competition::UEFAConferenceLeague,
            "UKRP" => Competition::UkrainianCup,
            "UKRS" => Competition::UkrainianSuperCup,
            "USC" => Competition::UEFASuperCup,
            _ => Competition::Missing
        }
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CompetitionType {
    League,
    #[serde(rename = "Domestic Cup")]
    DomesticCup,
    Other,
    Europe,
    #[serde(rename = "European Qualifying")]
    Missing,
}

impl CompetitionType {
    pub fn from_str(s: &str) -> Self {
        match s {
            "domestic_cup" => CompetitionType::DomesticCup,
            "international_cup" => CompetitionType::Europe,
            "other" => CompetitionType::Other,
            "domestic_league" => CompetitionType::League,
            _ => CompetitionType::Missing
        }
    }
}


