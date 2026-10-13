/// Parse and validate `ALLOWED_ORIGINS`.
/// Each origin must be `http://` or `https://` + host + optional `:port`,
/// with no path, query, fragment, trailing slash, or wildcard.
/// Returns the cleaned origins in order (deduplicated).
pub fn parse_allowed_origins(raw: &str) -> Result<Vec<String>, String> {
    let mut out: Vec<String> = Vec::new();
    for part in raw.split(',').map(str::trim).filter(|s| !s.is_empty()) {
        validate_single_origin(part)?;
        if !out.iter().any(|o| o == part) {
            out.push(part.to_string());
        }
    }
    if out.is_empty() {
        return Err(
            "ALLOWED_ORIGINS must contain at least one origin, e.g. \
             ALLOWED_ORIGINS=\"https://myapp.com,https://www.myapp.com\""
                .to_string(),
        );
    }
    Ok(out)
}

fn validate_single_origin(origin: &str) -> Result<(), String> {
    if origin.chars().any(char::is_whitespace) {
        return Err(format!(
            "invalid origin {origin:?}: must not contain whitespace \
             (use comma-separated list, e.g. \"https://a.com,https://b.com\")"
        ));
    }
    if origin.contains('*') {
        return Err(format!(
            "invalid origin {origin:?}: wildcards are not supported for \
             `allowed_origin`; list each origin explicitly"
        ));
    }
    if origin.ends_with('/') {
        return Err(format!(
            "invalid origin {origin:?}: remove trailing slash \
             (origins never include a path; browsers send \"Origin: https://example.com\")"
        ));
    }

    let rest = if let Some(r) = origin.strip_prefix("http://") {
        r
    } else if let Some(r) = origin.strip_prefix("https://") {
        r
    } else {
        return Err(format!(
            "invalid origin {origin:?}: must start with http:// or https://"
        ));
    };

    if rest.is_empty() {
        return Err(format!("invalid origin {origin:?}: missing host"));
    }
    if rest.contains('/') || rest.contains('?') || rest.contains('#') || rest.contains('@') {
        return Err(format!(
            "invalid origin {origin:?}: must be scheme + host + optional :port only, \
             with no path, query, fragment, or userinfo"
        ));
    }

    // Split host and optional :port. Bracketed IPv6 like [::1]:8080 is accepted.
    let (host, port) = if let Some(stripped) = rest.strip_prefix('[') {
        let end = stripped.find(']').ok_or_else(|| {
            format!("invalid origin {origin:?}: unterminated IPv6 brackets")
        })?;
        let host = &stripped[..end];
        let after = &stripped[end + 1..];
        let port = if after.is_empty() {
            None
        } else if let Some(p) = after.strip_prefix(':') {
            Some(p)
        } else {
            return Err(format!(
                "invalid origin {origin:?}: unexpected characters after ']'"
            ));
        };
        (host, port)
    } else {
        match rest.rsplit_once(':') {
            // Distinguish host:port from a bare ':' or extra colons.
            Some((h, p)) if !p.contains(':') && !h.is_empty() => {
                // If what follows ':' is all digits, treat as port; otherwise
                // it's an invalid host (colons only allowed for ports).
                if !p.is_empty() && p.chars().all(|c| c.is_ascii_digit()) {
                    (h, Some(p))
                } else {
                    return Err(format!(
                        "invalid origin {origin:?}: ':' is only allowed for :port \
                         (got {p:?}); IPv6 must use brackets like http://[::1]:8080"
                    ));
                }
            }
            _ => (rest, None),
        }
    };

    if host.is_empty() {
        return Err(format!("invalid origin {origin:?}: missing host"));
    }
    if host.contains(':') {
        return Err(format!(
            "invalid origin {origin:?}: IPv6 must use brackets like http://[::1]:8080"
        ));
    }

    if let Some(p) = port {
        match p.parse::<u16>() {
            Ok(0) => {
                return Err(format!("invalid origin {origin:?}: port must be 1-65535"));
            }
            Ok(_) => {}
            Err(_) => {
                return Err(format!(
                    "invalid origin {origin:?}: port {p:?} must be numeric 1-65535"
                ));
            }
        }
    }

    // Host labels: allow alphanumerics, '-', '.' (plus ':' handled above).
    // Single-label hosts like "localhost" are allowed for dev.
    let is_bracketed_ipv6 = origin.contains('[');
    if !is_bracketed_ipv6 {
        for label in host.split('.') {
            if label.is_empty() {
                return Err(format!(
                    "invalid origin {origin:?}: empty label in host {host:?}"
                ));
            }
            if label.starts_with('-') || label.ends_with('-') {
                return Err(format!(
                    "invalid origin {origin:?}: host label {label:?} must not start or end with '-'"
                ));
            }
            if !label
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-')
            {
                return Err(format!(
                    "invalid origin {origin:?}: host label {label:?} may only contain \
                     letters, digits, and '-'"
                ));
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_single_https_origin() {
        assert_eq!(
            parse_allowed_origins("https://myapp.com").unwrap(),
            vec!["https://myapp.com".to_string()]
        );
    }

    #[test]
    fn accepts_localhost_with_port_and_multiple_origins() {
        assert_eq!(
            parse_allowed_origins("http://localhost:3000, https://myapp.com").unwrap(),
            vec![
                "http://localhost:3000".to_string(),
                "https://myapp.com".to_string()
            ]
        );
    }

    #[test]
    fn deduplicates_and_trims() {
        assert_eq!(
            parse_allowed_origins("https://a.com, https://a.com ").unwrap(),
            vec!["https://a.com".to_string()]
        );
    }

    #[test]
    fn rejects_empty() {
        assert!(parse_allowed_origins("").is_err());
        assert!(parse_allowed_origins("  ,  ").is_err());
    }

    #[test]
    fn rejects_trailing_slash_path_query_fragment() {
        for bad in [
            "https://example.com/",
            "https://example.com/api",
            "https://example.com?x=1",
            "https://example.com#frag",
        ] {
            assert!(parse_allowed_origins(bad).is_err(), "{bad} should fail");
        }
    }

    #[test]
    fn rejects_missing_scheme_and_wildcards() {
        for bad in ["example.com", "*.example.com", "https://*", "null"] {
            assert!(parse_allowed_origins(bad).is_err(), "{bad} should fail");
        }
    }

    #[test]
    fn rejects_bad_ports_and_inner_whitespace() {
        for bad in [
            "https://example.com:notaport",
            "https://example.com:",
            "http://",
            "https://exam ple.com",
        ] {
            assert!(parse_allowed_origins(bad).is_err(), "{bad} should fail");
        }
    }
}
