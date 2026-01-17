package com.moud.endlessdimensions.portal;

import java.util.Collections;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

public final class PortalRegistry {
    private final PortalRegistryStore store;
    private final Map<PortalKey, PortalLink> links = new ConcurrentHashMap<>();
    private final Map<LegacyKey, LegacyLink> legacyLinks = new ConcurrentHashMap<>();

    public PortalRegistry(PortalRegistryStore store) {
        this.store = Objects.requireNonNull(store, "store");
    }

    public void load() {
        PortalRegistrySnapshot snapshot = store.load();
        links.clear();
        legacyLinks.clear();
        links.putAll(snapshot.links());
        legacyLinks.putAll(snapshot.legacyLinks());
    }

    public void save() {
        store.save(links, legacyLinks);
    }

    public PortalLink getLink(PortalKey key) {
        return links.get(key);
    }

    public LegacyLink getLegacy(LegacyKey key) {
        return legacyLinks.get(key);
    }

    public void putLink(PortalKey key, PortalLink link) {
        links.put(key, link);
    }

    public void removeLink(PortalKey key) {
        links.remove(key);
    }

    public void putLegacy(LegacyKey key, LegacyLink link) {
        legacyLinks.put(key, link);
    }

    public void removeLegacy(LegacyKey key) {
        legacyLinks.remove(key);
    }

    public Map<PortalKey, PortalLink> links() {
        return Collections.unmodifiableMap(links);
    }

    public Map<LegacyKey, LegacyLink> legacyLinks() {
        return Collections.unmodifiableMap(legacyLinks);
    }
}
