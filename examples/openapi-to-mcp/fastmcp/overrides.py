"""Hand-written descriptions for operations whose spec text is missing or too thin.

Keyed by operationId. Kept separate from server.py so it is obvious which text
came from the spec and which came from a human. When the upstream spec is
fixed, delete the matching entry here.
"""

DESCRIPTION_OVERRIDES: dict[str, str] = {
    # --- no description in the spec at all ---
    "dispatchShipment": (
        "Purchases the label and hands a draft shipment to the carrier. "
        "The shipment moves from `draft` to `dispatched`, gets a tracking "
        "number, and its packages become frozen. Returns 409 if the shipment "
        "is not a draft, and 402 if the account balance cannot cover the label. "
        "International shipments need a `commercial_invoice` document first."
    ),
    "listPackages": (
        "Lists the packages that belong to one shipment, oldest first, with "
        "cursor pagination. Each package carries weight, dimensions and, "
        "after dispatch, its own tracking number."
    ),
    "removePackage": (
        "Removes a package from a draft shipment. Returns 409 once the "
        "shipment has been dispatched, because carrier pricing is locked to "
        "the package set at dispatch time."
    ),
    "cancelPickup": (
        "Cancels a scheduled carrier pickup. Only pickups in `requested` or "
        "`confirmed` status can be cancelled; completed pickups return 409."
    ),
    "testWebhookSubscription": (
        "Sends a synthetic `shipment.status_changed` event to the "
        "subscription's URL and reports whether the endpoint answered, its "
        "HTTP status, and how long it took. Use it to verify signature "
        "handling before relying on real deliveries."
    ),
    # --- present but useless ---
    "updateShipment": (
        "Changes the mutable fields of a draft shipment: reference, "
        "service_code, ship_to address, label_format and metadata. Sender "
        "address and packages cannot be changed here (use addPackage / "
        "removePackage). Returns 409 once the shipment is dispatched."
    ),
    "getPackage": (
        "Returns one package by id: weight, dimensions, declared value, "
        "contents, the shipment it belongs to, and its tracking number if "
        "the shipment has been dispatched."
    ),
    "getCarrier": (
        "Returns one carrier by id (for example `car_ups`): display name, "
        "whether this account has connected credentials, the countries it "
        "ships from, and a tracking URL template."
    ),
    "getWebhookSubscription": (
        "Returns one webhook subscription: target URL, subscribed event "
        "types, active flag, and 24-hour delivery health. The signing "
        "secret is never returned here."
    ),
}
