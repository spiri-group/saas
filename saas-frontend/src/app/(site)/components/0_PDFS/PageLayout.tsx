import { Page, Text, View, Document, StyleSheet, Image  } from "@react-pdf/renderer"
import React from "react";

export const PageLayoutStyles = StyleSheet.create({
    base: {
        fontSize: "10px",
        borderBottomWidth: 1, // Light grey line between rows
        borderBottomColor: '#E0E0E0', // Light grey color
        paddingVertical: 10,
        paddingBottom: 10,
    },
    bold: {
        fontFamily: "Helvetica-Bold"
    },
    rowView: {
        display: 'flex', flexDirection: 'row', borderTop: '1px solid #EEE', paddingTop: 8, paddingBottom: 8
    },
    qtyColumn: {
        width: 100, // adjust this value as needed
        marginLeft: 10,
        fontSize: "12px"
    },
    pageBackground: {
        position: 'absolute',
        width: '100%',
        height: 85
    },
    page: {
        flexDirection: 'column',
        justifyContent: 'space-between'
    },
    content: {
        flexGrow: 1,
        marginTop: 90,
        marginLeft: 40,
        marginRight: 40
    },
    footer: {
        marginTop: 'auto',
        padding: 20,
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: 'rgba(36, 39, 42, 1)',
        width: '100%',
        height: '120px',
    },
    footerColumn: {
        display: 'flex',
        flexDirection: 'column',
        width: 150,
    },
    footerText: {
        fontSize: 10, // Increased font size for better readability
        color: "#FFFFFF", // Retained the brand color
        fontFamily: "Helvetica", // Made the text bold
    },
    footerTextSecondary: {
        fontSize: 10, // Increased font size for better readability
        color: "#FFFFFF", // Retained the brand color
        marginTop: 5,
        fontFamily: "Helvetica", // Made the text bold
    }
});

type Props = {
    children: React.ReactNode,
    bottomContent?: React.ReactNode,
    actionContent?: React.ReactNode,
    topRightContent?: React.ReactNode
}

const PageLayout = ({ children, bottomContent, actionContent, topRightContent } : Props) => {
    return (
        <Document>
            <Page size="A4" style={PageLayoutStyles.page}>
                <View style={{ position: "relative" }}>
                    {/*eslint-disable-next-line jsx-a11y/alt-text*/}
                    <Image 
                        fixed={true}
                        src={"/pdf_background_v2.png"} 
                        style={PageLayoutStyles.pageBackground} />
                </View>
                <View style={{ position: "absolute", right: 25, top: 24 }}>
                    {topRightContent}
                </View>
              <View style={PageLayoutStyles.content}>
                <View style={{ flex: 1 }}>
                    {children}
                </View>
                <View>
                    {actionContent}
                </View>
              </View>
              <View style={PageLayoutStyles.footer}>
                <View style={PageLayoutStyles.footerColumn}>
                    <Text style={PageLayoutStyles.footerText}>SpiriVerse</Text>
                    <Text style={[PageLayoutStyles.footerText, { marginTop: "10px"}]}>Subsidairy of, SpiriGroup Pty Ltd</Text>
                    <Text style={[PageLayoutStyles.footerText, { marginTop: "10px"}]}>ABN 13 638 818 523</Text>
                    <Text style={[PageLayoutStyles.footerText, { marginTop: "10px"}]}>Sydney Australia</Text>
                </View>
                {bottomContent}
              </View>
            </Page>
        </Document>
    )   
}

export default PageLayout