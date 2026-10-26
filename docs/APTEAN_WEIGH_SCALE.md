# Aptean Weigh Scale and Weighbridge Receiving knowledge

Knowledge pack: [`src/knowledge-packs/aptean-weigh-scale.json`](../src/knowledge-packs/aptean-weigh-scale.json) (`packId: aptean-weigh-scale`).

This section explains recorded steps from three Aptean add-ons for Business Central. They are vendor extensions, not standard Business Central. The rules are kept apart from the Microsoft packs, so Microsoft explanations never cite Aptean behaviour and Aptean explanations always cite Aptean documentation.

| Module | Code | Role | Documentation |
|---|---|---|---|
| Weigh Scale | WSC | Weighs warehouse receipt, warehouse shipment and production lines and stores weigh scale entries. | [Introduction](https://erpdocs.apteancloud.com/bc/docs/WSC/introduction/) |
| Scale Integration | SCI | Connects physical scales through PrintNode and provides the readings used by Get Weight. | [Scale integration](https://erpdocs.apteancloud.com/bc/docs/SCI/scale-integration/) |
| Weighbridge Receiving | WBR | Weighs loaded and empty vehicles on a weighbridge ticket to calculate the received net weight. | [Introduction](https://erpdocs.apteancloud.com/bc/docs/WBR/introduction/) |

All sources were accessed on 2026-10-26. Each source in the pack records its article date, the facts it states and the captions it documents.

## Weigh Scale (WSC)

**Setup.** WSC requires three setups:

1. **Permission sets.** Assign `WEIGHSCALE122FDW` (direct) or `WSCBASIC122FDW` (indirect) on the User Card.
2. **Weigh Scale Setup.** Set **Use Lot No. for Receipt** and **Use Packaging Code**.
3. **Weigh Scale User Setup.** Set a default scale per user, location and purpose.

Default scales can be set on the location, the warehouse receipt or shipment, and the work or machine center. A scale can only be chosen after SCI has **Scale Verification** set to *Verified*.

**Registration.** Choose **Line > Register Weight** on a warehouse receipt or shipment line. This opens **Weigh Scale Registration**, where:

- **Get Weight** reads the scale into **Weight From Scale**, and **Fill Weight Manually** lets you type that value.
- **Weight Quantity To Handle** is **Weight From Scale** minus **Tare Weight**.
- **Assign Lot No.**, **Create License Plate** and **Assign Lot Attributes** complete the tracking data.
- **Save** or **Save and Print Labels** registers a weigh scale entry. The warehouse document is not posted.

The registration page does not open in these cases:

- The item is neither lot- nor license-plate-tracked.
- A non-catch-weight item has a unit that is not in the scale UOM setup.
- For shipments: the warehouse pick has not been registered.

**Entries.** **Line > Weigh Scale Entries** lists the entries. Entries with status *Pending* must be moved to item tracking with **Related > Transfer Weigh Scale Entries**, because a receipt with pending entries cannot be posted. **Change Status** resets a *Transferred* entry to *Pending*.

## Weighbridge Receiving (WBR)

A **Weighbridge Ticket** is created from a purchase order or a warehouse receipt.

- **Actions > Get Weight** fills **Inbound Scale Reading** or **Outbound Scale Reading**.
- **Without Unknown Tare Receiving:** **Post Quantity To Receive** posts the released source document and sets the ticket to *Posted*. Only one ticket can be posted per purchase order line.
- **With Unknown Tare Receiving:** **Create Inbound Register** and later **Create Outbound Register** each post the source document. They create license plates and detailed warehouse entries, and set the status to *Inbound Registered* and *Outbound Registered*. This flow requires Aptean Beverage Advanced Warehouse Management and lot- and license-plate-tracked items.

## Rules

| Rule | Page | Caption | Basis |
|---|---|---|---|
| `Observed.Warehouse.RegisterWeight` | Warehouse Receipt (page 5768) | Register Weight | Recorded workflow, supported by WSC |
| `Observed.Warehouse.ManualWeight` | Warehouse Receipt (page 5768) | Manual weight (recorded) | Recorded workflow, supported by WSC |
| `Observed.Warehouse.EnterScaleWeight` | Warehouse Receipt (page 5768) | Weight from scale | Recorded workflow, supported by WSC |
| `Observed.Warehouse.SaveWeightRegistration` | Warehouse Receipt (page 5768) | Save and close (recorded) | Recorded workflow, supported by WSC |
| `Observed.Warehouse.SelectHandlingUnitCode` | Warehouse Receipt (page 5768) | Handling Unit Code (recorded) | Recorded workflow, related WBR articles |
| `Observed.Warehouse.SelectDeliveryUnitCode` | Warehouse Receipt (page 5768) | Delivery Unit Code (recorded) | Recorded workflow, related WBR articles |
| `Observed.Warehouse.SetDeliveryUnitCount` | Warehouse Receipt (page 5768) | Number of Delivery Units (recorded) | Recorded workflow, related WBR articles |
| `Observed.Warehouse.CreateHandlingUnit` | Warehouse Receipt (page 5768) | Create handling unit (recorded) | Recorded workflow, related WBR articles |
| `AptWeighScale.RegisterWeightShipment` | Warehouse Shipment | Register Weight | WSC documentation |
| `AptWeighScale.GetWeight` | Weigh Scale Registration | Get Weight | WSC and SCI documentation |
| `AptWeighScale.FillWeightManually` | Weigh Scale Registration | Fill Weight Manually | WSC documentation |
| `AptWeighScale.SaveRegistration` | Weigh Scale Registration | Save | WSC documentation |
| `AptWeighScale.SaveAndPrintLabels` | Weigh Scale Registration | Save and Print Labels | WSC documentation |
| `AptWeighScale.AssignLotNo` | Weigh Scale Registration | Assign Lot No. | WSC documentation |
| `AptWeighScale.CreateLicensePlate` | Weigh Scale Registration | Create License Plate | WSC documentation |
| `AptWeighScale.AssignLotAttributes` | Weigh Scale Registration | Assign Lot Attributes | WSC documentation |
| `AptWeighScale.ChangeEntryStatus` | Weigh Scale Registration | Change Status | WSC documentation |
| `AptWeighScale.OpenWeighScaleEntries` | Warehouse Receipt, Warehouse Shipment, Released Production Order | Weigh Scale Entries | WSC documentation |
| `AptWeighScale.TransferWeighScaleEntries` | Warehouse Receipt, Warehouse Shipment | Transfer Weigh Scale Entries | WSC documentation |
| `AptWeighbridge.GetWeight` | Weighbridge Ticket | Get Weight | WBR documentation |
| `AptWeighbridge.CreateInboundRegister` | Weighbridge Ticket | Create Inbound Register | WBR documentation |
| `AptWeighbridge.CreateOutboundRegister` | Weighbridge Ticket | Create Outbound Register | WBR documentation |
| `AptWeighbridge.PostQuantityToReceive` | Weighbridge Ticket | Post Quantity To Receive | WBR documentation |

**Rule IDs.** The eight `Observed.Warehouse.*` rules keep the IDs they had in the warehouse pack, because saved recordings may reference them. Their explanations describe the recorded workflow, so their provenance is reported as `observed-workflow`. The Aptean articles are listed as supporting sources.

**Captions and languages.** New rules match only captions that appear in the cited Aptean articles (`documentedCaptions`). Every explanation is available in all eight registered languages. Captured captions, such as **Weight From Scale**, stay in their recorded form.

## Documentation gaps

- **English captions only.** Aptean publishes English captions only. Localized captions for these add-ons are not verified, so new rules match English captions.
- **Recorded captions without public documentation.** Handling Unit Code, Delivery Unit Code, Number of Delivery Units and Create handling unit were recorded on warehouse receipts but do not appear in the public WSC or WBR articles.
- **Recorded captions that differ from the articles.**
  - Manual weight and Save and close were recorded on the warehouse receipt.
  - The articles document Fill Weight Manually and Save on Weigh Scale Registration.
- **Scale Integration pages not retrieved.** The SCI setup, test and log pages were not retrieved.
- **Release notes not retrieved.** Only the WSC release list is recorded: from 2301.0.0.0 (September 2023) to 2604.0.0.0 (October 2026). The individual release notes were not retrieved.
- **Documentation inconsistencies.**
  - Aptean's own articles use both "Weigh Scale Registration" and "Weight Scale Registration", so both page captions are accepted.
  - The Variant Code description in the registration article appears to be a copy error.

To extend this section, cite the specific Aptean article and record its captions in `documentedCaptions`. Do not translate or guess captions that the add-on has not been observed to show.
