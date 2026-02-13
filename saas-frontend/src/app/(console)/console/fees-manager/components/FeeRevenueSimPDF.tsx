import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import {
  FeeGroup,
  SimulationInput,
  formatFeeKey,
  formatCentsAsDollars,
  computeMonthlyRevenue,
  getCustomerPrice,
  getPlatformPercent,
  getPlatformAmount,
} from "../constants/feeGroups";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#333333",
    paddingBottom: 6,
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
    textTransform: "uppercase",
  },
  groupHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 2,
  },
  groupName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#222222",
  },
  feeRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  subtotalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingVertical: 5,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  subtotalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#444444",
  },
  subtotalValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a7a3a",
  },
  grandTotalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: "#333333",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 12,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a7a3a",
  },
  cell: {
    fontSize: 9,
    color: "#333333",
  },
  cellMono: {
    fontSize: 8,
    color: "#666666",
    fontFamily: "Courier",
  },
  cellRight: {
    fontSize: 9,
    color: "#333333",
    textAlign: "right",
  },
  cellGreen: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a7a3a",
    textAlign: "right",
  },
  cellMuted: {
    fontSize: 8,
    color: "#999999",
    textAlign: "right",
  },
  // Column widths
  colName: { width: "20%" },
  colKey: { width: "16%" },
  colCustPrice: { width: "11%" },
  colPlatPct: { width: "10%" },
  colPlatAmt: { width: "11%" },
  colCurrency: { width: "7%" },
  colVolume: { width: "10%" },
  colRev: { width: "15%" },
});

interface FeeRevenueSimPDFProps {
  groups?: FeeGroup[];
  simInputs?: Record<string, SimulationInput>;
}

const FeeRevenueSimPDF: React.FC<FeeRevenueSimPDFProps> = ({
  groups = [],
  simInputs = {},
}) => {
  let grandTotal = 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Fee Revenue Simulation</Text>
        <Text style={styles.subtitle}>
          Generated {new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        {/* Table header */}
        <View style={styles.tableHeader}>
          <View style={styles.colName}>
            <Text style={styles.headerCell}>Fee Name</Text>
          </View>
          <View style={styles.colKey}>
            <Text style={styles.headerCell}>Key</Text>
          </View>
          <View style={styles.colCustPrice}>
            <Text style={[styles.headerCell, { textAlign: "right" }]}>Customer $</Text>
          </View>
          <View style={styles.colPlatPct}>
            <Text style={[styles.headerCell, { textAlign: "right" }]}>Platform %</Text>
          </View>
          <View style={styles.colPlatAmt}>
            <Text style={[styles.headerCell, { textAlign: "right" }]}>Platform $</Text>
          </View>
          <View style={styles.colCurrency}>
            <Text style={styles.headerCell}>Ccy</Text>
          </View>
          <View style={styles.colVolume}>
            <Text style={[styles.headerCell, { textAlign: "right" }]}>Volume</Text>
          </View>
          <View style={styles.colRev}>
            <Text style={[styles.headerCell, { textAlign: "right" }]}>Monthly Rev</Text>
          </View>
        </View>

        {/* Groups */}
        {groups.map((group) => {
          let subtotal = 0;
          for (const { key, config } of group.fees) {
            const sim = simInputs[key] ?? { volume: 0, avgSale: 0 };
            subtotal += computeMonthlyRevenue(config, sim, key);
          }
          grandTotal += subtotal;

          return (
            <View key={group.name}>
              {/* Group header */}
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>
                  {group.name} ({group.fees.length})
                </Text>
              </View>

              {/* Fee rows */}
              {group.fees.map(({ key, config }) => {
                const sim = simInputs[key] ?? { volume: 0, avgSale: 0 };
                const rev = computeMonthlyRevenue(config, sim, key);
                const custPrice = getCustomerPrice(key, config);
                const platPct = getPlatformPercent(key, config);
                const platAmt = getPlatformAmount(key, config);

                return (
                  <View style={styles.feeRow} key={key}>
                    <View style={styles.colName}>
                      <Text style={styles.cell}>{formatFeeKey(key)}</Text>
                    </View>
                    <View style={styles.colKey}>
                      <Text style={styles.cellMono}>{key}</Text>
                    </View>
                    <View style={styles.colCustPrice}>
                      <Text style={custPrice !== null ? styles.cellRight : styles.cellMuted}>
                        {custPrice !== null ? formatCentsAsDollars(custPrice) : "Varies"}
                      </Text>
                    </View>
                    <View style={styles.colPlatPct}>
                      <Text style={styles.cellRight}>
                        {platPct > 0 ? `${platPct}%` : "-"}
                      </Text>
                    </View>
                    <View style={styles.colPlatAmt}>
                      <Text style={platAmt !== null ? styles.cellGreen : styles.cellMuted}>
                        {platAmt !== null ? formatCentsAsDollars(platAmt) : "Varies"}
                      </Text>
                    </View>
                    <View style={styles.colCurrency}>
                      <Text style={styles.cell}>{config.currency}</Text>
                    </View>
                    <View style={styles.colVolume}>
                      <Text style={styles.cellRight}>
                        {sim.volume > 0 ? sim.volume.toString() : "-"}
                      </Text>
                    </View>
                    <View style={styles.colRev}>
                      <Text style={rev > 0 ? styles.cellGreen : styles.cellRight}>
                        {rev > 0 ? formatCentsAsDollars(rev) : "-"}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {/* Subtotal */}
              <View style={styles.subtotalRow}>
                <View style={{ width: "85%" }}>
                  <Text style={[styles.subtotalLabel, { textAlign: "right" }]}>
                    Subtotal: {group.name}
                  </Text>
                </View>
                <View style={styles.colRev}>
                  <Text style={[styles.subtotalValue, { textAlign: "right" }]}>
                    {formatCentsAsDollars(subtotal)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Grand total */}
        <View style={styles.grandTotalRow}>
          <View style={{ width: "85%" }}>
            <Text style={[styles.grandTotalLabel, { textAlign: "right" }]}>Grand Total</Text>
          </View>
          <View style={styles.colRev}>
            <Text style={[styles.grandTotalValue, { textAlign: "right" }]}>
              {formatCentsAsDollars(grandTotal)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default FeeRevenueSimPDF;
