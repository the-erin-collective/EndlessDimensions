package com.moud.endlessdimensions.portal;

import java.util.Objects;
import java.util.UUID;

public record PortalLink(LinkType type, UUID linkId, DestinationRef destination) {
    public PortalLink {
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(linkId, "linkId");
        Objects.requireNonNull(destination, "destination");
    }
}
