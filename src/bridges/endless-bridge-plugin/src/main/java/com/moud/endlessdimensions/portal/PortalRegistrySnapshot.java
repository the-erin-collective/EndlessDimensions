package com.moud.endlessdimensions.portal;

import java.util.Map;

public record PortalRegistrySnapshot(Map<PortalKey, PortalLink> links,
                                     Map<LegacyKey, LegacyLink> legacyLinks) {
}
