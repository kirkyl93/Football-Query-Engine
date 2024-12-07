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

pub fn map_sub_position_code_to_position(s: &str) -> &str {
    match s {
        "GK" => "Goalkeeper",
        "LB" => "Left-Back",
        "CB" => "Centre-Back",
        "RB" => "Right-Back",
        "CDM" => "Defensive Midfield",
        "LM" => "Left Midfield",
        "CM" => "Central Midfield",
        "RM" => "Right Midfield",
        "LW" => "Left Winger",
        "RW" => "Right Winger",
        "CAM" => "Attacking Midfield",
        "SS" => "Second Striker",
        "CF" => "Centre-Forward",
        _ => "Missing"
    }
}

#[derive(Copy, Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerPosition {
    Goalkeeper,
    Defender,
    Midfield,
    Attack,
    #[serde(rename = "Unknown")]
    Missing,
}

impl TryFrom<&str> for PlayerPosition {
    type Error = ();

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "Goalkeeper" => Ok(Self::Goalkeeper),
            "Defender" => Ok(Self::Defender),
            "Midfield" => Ok(Self::Midfield),
            "Attack" => Ok(Self::Attack),
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