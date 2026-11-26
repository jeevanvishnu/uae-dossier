/**
 * Standard eCTD utility files required inside `<sequence>/util/` for
 * ICH eCTD 3.2 and GCC/UAE MOHAP regional validation.
 */

export const ICH_ECTD_3_2_DTD = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ICH eCTD Backbone DTD v3.2 -->
<!ELEMENT ectd:ectd (
  m1-administrative-information-and-prescribing-information?,
  m2-common-technical-document-summaries?,
  m3-quality?,
  m4-nonclinical-study-reports?,
  m5-clinical-study-reports?
)>
<!ATTLIST ectd:ectd
  xmlns:ectd CDATA #FIXED "http://www.ich.org/ectd"
  xmlns:xlink CDATA #FIXED "http://www.w3.org/1999/xlink"
  dtd-version CDATA #FIXED "3.2"
>

<!ELEMENT m1-administrative-information-and-prescribing-information (leaf*)>
<!ELEMENT m2-common-technical-document-summaries (leaf*)>
<!ELEMENT m3-quality (leaf*)>
<!ELEMENT m4-nonclinical-study-reports (leaf*)>
<!ELEMENT m5-clinical-study-reports (leaf*)>

<!ELEMENT leaf (title, link-text?)>
<!ATTLIST leaf
  ID ID #REQUIRED
  application-version CDATA #IMPLIED
  xlink:type (simple) #FIXED "simple"
  xlink:href CDATA #REQUIRED
  xlink:role CDATA #IMPLIED
  xlink:actuate (onLoad | onRequest | other | none) #IMPLIED
  xlink:show (new | replace | embed | other | none) #IMPLIED
  checksum CDATA #REQUIRED
  checksum-type CDATA #REQUIRED
  modified-file CDATA #IMPLIED
  operation (new | append | replace | delete) #REQUIRED
  section CDATA #IMPLIED
  xml:lang CDATA #IMPLIED
>
<!ELEMENT title (#PCDATA)>
<!ELEMENT link-text (#PCDATA)>
`;

export const GCC_REGIONAL_DTD = `<?xml version="1.0" encoding="UTF-8"?>
<!-- UAE / GCC Regional Module 1 DTD v1.0 -->
<!ELEMENT ae:ae-regional (admin, m1-ae)>
<!ATTLIST ae:ae-regional
  xmlns:ae CDATA #FIXED "urn:ae:mohap:ectd:v1.0"
  xmlns:xlink CDATA #FIXED "http://www.w3.org/1999/xlink"
>

<!ELEMENT admin (
  country,
  procedure-kind,
  procedure-type,
  application-number,
  submission-sequence,
  submission-date,
  product-name,
  dosage-form,
  strength,
  mah-holder,
  uae-local-agent,
  atc-code
)>
<!ELEMENT country (#PCDATA)>
<!ELEMENT procedure-kind (#PCDATA)>
<!ELEMENT procedure-type (#PCDATA)>
<!ELEMENT application-number (#PCDATA)>
<!ELEMENT submission-sequence (#PCDATA)>
<!ELEMENT submission-date (#PCDATA)>
<!ELEMENT product-name (#PCDATA)>
<!ELEMENT dosage-form (#PCDATA)>
<!ELEMENT strength (#PCDATA)>
<!ELEMENT mah-holder (#PCDATA)>
<!ELEMENT uae-local-agent (#PCDATA)>
<!ELEMENT atc-code (#PCDATA)>

<!ELEMENT m1-ae (leaf*)>
<!ELEMENT leaf (title)>
<!ATTLIST leaf
  ID ID #REQUIRED
  xlink:type (simple) #FIXED "simple"
  xlink:href CDATA #REQUIRED
  checksum CDATA #REQUIRED
  checksum-type CDATA #REQUIRED
  operation (new | append | replace | delete) #REQUIRED
  section CDATA #IMPLIED
  xml:lang CDATA #IMPLIED
>
<!ELEMENT title (#PCDATA)>
`;

export const GCC_REGIONAL_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:ae="urn:ae:mohap:ectd:v1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/ae:ae-regional">
    <html>
      <head>
        <title>UAE / GCC eCTD Regional Module 1</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #1e293b; }
          h1 { font-size: 18px; color: #0f172a; border-bottom: 2px solid #0ea5e9; padding-bottom: 6px; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>UAE / GCC eCTD Module 1 — <xsl:value-of select="admin/product-name"/></h1>
        <table>
          <tr><th>Country</th><td><xsl:value-of select="admin/country"/></td></tr>
          <tr><th>Procedure Kind</th><td><xsl:value-of select="admin/procedure-kind"/></td></tr>
          <tr><th>Procedure Type</th><td><xsl:value-of select="admin/procedure-type"/></td></tr>
          <tr><th>Application Number</th><td><xsl:value-of select="admin/application-number"/></td></tr>
          <tr><th>Sequence</th><td><xsl:value-of select="admin/submission-sequence"/></td></tr>
        </table>
        <table>
          <thead>
            <tr><th>Section</th><th>Title</th><th>File</th><th>Operation</th><th>MD5</th></tr>
          </thead>
          <tbody>
            <xsl:for-each select="m1-ae/leaf">
              <tr>
                <td><xsl:value-of select="@section"/></td>
                <td><xsl:value-of select="title"/></td>
                <td><xsl:value-of select="@xlink:href"/></td>
                <td><xsl:value-of select="@operation"/></td>
                <td><xsl:value-of select="@checksum"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`;
