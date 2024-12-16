use serde::{Deserialize, Serialize};

#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerSubPosition {
    #[serde(rename = "GK")]
    Goalkeeper,
    #[serde(rename = "LB")]
    LeftBack,
    #[serde(rename = "CB")]
    CentreBack,
    #[serde(rename = "RB")]
    RightBack,
    #[serde(rename = "CDM")]
    DefensiveMidfield,
    #[serde(rename = "LM")]
    LeftMidfield,
    #[serde(rename = "CM")]
    CentralMidfield,
    #[serde(rename = "RM")]
    RightMidfield,
    #[serde(rename = "LW")]
    LeftWinger,
    #[serde(rename = "RW")]
    RightWinger,
    #[serde(rename = "CAM")]
    AttackingMidfield,
    #[serde(rename = "SS")]
    SecondStriker,
    #[serde(rename = "CF")]
    CentreForward,
    Missing,
}

impl PlayerSubPosition {
    pub fn as_str(&self) -> &'static str {
        match self {
            PlayerSubPosition::Goalkeeper => "Goalkeeper",
            PlayerSubPosition::LeftBack => "Left-Back",
            PlayerSubPosition::CentreBack => "Centre-Back",
            PlayerSubPosition::RightBack => "Right-Back",
            PlayerSubPosition::DefensiveMidfield => "Defensive Midfield",
            PlayerSubPosition::LeftMidfield => "Left Midfield",
            PlayerSubPosition::CentralMidfield => "Central Midfield",
            PlayerSubPosition::RightMidfield => "Right Midfield",
            PlayerSubPosition::LeftWinger => "Left Winger",
            PlayerSubPosition::RightWinger => "Right Winger",
            PlayerSubPosition::AttackingMidfield => "Attacking Midfield",
            PlayerSubPosition::SecondStriker => "Second Striker",
            PlayerSubPosition::CentreForward => "Centre-Forward",
            PlayerSubPosition::Missing => ""
        }
    }
    pub fn from_code(p: &str) -> Self {
        match p {
            "GK" => PlayerSubPosition::Goalkeeper,
            "LB" => PlayerSubPosition::LeftBack,
            "CB" => PlayerSubPosition::CentreBack,
            "RB" => PlayerSubPosition::RightBack,
            "CDM" => PlayerSubPosition::DefensiveMidfield,
            "LM" => PlayerSubPosition::LeftMidfield,
            "CM" => PlayerSubPosition::CentralMidfield,
            "RM" => PlayerSubPosition::RightMidfield,
            "LW" => PlayerSubPosition::LeftWinger,
            "RW" => PlayerSubPosition::RightWinger,
            "CAM" => PlayerSubPosition::AttackingMidfield,
            "SS" => PlayerSubPosition::SecondStriker,
            "CF" => PlayerSubPosition::CentreForward,
            _ => PlayerSubPosition::Missing,
        }
    }
}

impl TryFrom<&str> for PlayerSubPosition {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "Goalkeeper" => Ok(Self::Goalkeeper),
            "Left-Back" => Ok(Self::LeftBack),
            "Centre-Back" => Ok(Self::CentreBack),
            "Right-Back" => Ok(Self::RightBack),
            "Defensive Midfield" => Ok(Self::DefensiveMidfield),
            "Left Midfield" => Ok(Self::LeftMidfield),
            "Central Midfield" => Ok(Self::CentralMidfield),
            "Right Midfield" => Ok(Self::RightMidfield),
            "Left Winger" => Ok(Self::LeftWinger),
            "Right Winger" => Ok(Self::RightWinger),
            "Attacking Midfield" => Ok(Self::AttackingMidfield),
            "Second Striker" => Ok(Self::SecondStriker),
            "Centre-Forward" => Ok(Self::CentreForward),
            _ => Err(()),
        }
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Foot {
    Left,
    Right,
    Both,
    Missing,
}

impl TryFrom<&str> for Foot {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.to_lowercase().as_str() {
            "left" => Ok(Self::Left),
            "right" => Ok(Self::Right),
            "both" => Ok(Self::Both),
            _ => Err(()),
        }
    }
}