import * as Samlify from 'samlify';

function ssoConfig() {
  return {
    entityId: process.env.SSO_ENTITY_ID || '',
    assertionUrl: process.env.SSO_ASSERTION_URL || '',
    idpMetadataUrl: process.env.SSO_IDP_METADATA_URL || '',
    idpMetadataXml: process.env.SSO_IDP_METADATA_XML || '',
  };
}

export function isSsoConfigured() {
  const config = ssoConfig();
  return Boolean(config.entityId && config.assertionUrl && (config.idpMetadataUrl || config.idpMetadataXml));
}

export async function loadIdpMetadata(fetchImpl = fetch) {
  const config = ssoConfig();
  if (config.idpMetadataXml) {
    return config.idpMetadataXml;
  }
  if (!config.idpMetadataUrl) {
    throw new Error('SSO IdP metadata not configured');
  }
  const res = await fetchImpl(config.idpMetadataUrl);
  if (!res.ok) {
    throw new Error(`IdP metadata fetch failed (${res.status})`);
  }
  return res.text();
}

export function buildServiceProvider() {
  const config = ssoConfig();
  if (!config.entityId || !config.assertionUrl) {
    throw new Error('SSO SP not configured (SSO_ENTITY_ID, SSO_ASSERTION_URL)');
  }
  return Samlify.ServiceProvider({
    entityID: config.entityId,
    assertionConsumerService: [{ Binding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST', Location: config.assertionUrl }],
  });
}

export async function buildIdentityProvider(fetchImpl = fetch) {
  const metadata = await loadIdpMetadata(fetchImpl);
  return Samlify.IdentityProvider({ metadata });
}

export async function buildLoginRequest(fetchImpl = fetch) {
  const sp = buildServiceProvider();
  const idp = await buildIdentityProvider(fetchImpl);
  const { id, context } = await sp.createLoginRequest(idp, 'redirect');
  return { id, url: context };
}

export async function handleAcs(body, fetchImpl = fetch) {
  const sp = buildServiceProvider();
  const idp = await buildIdentityProvider(fetchImpl);
  const { extract } = await sp.parseLoginResponse(idp, 'post', { body });
  const attributes = extract.attributes || {};
  const first = (value) => (Array.isArray(value) ? value[0] : value);
  const email = first(attributes.email || attributes.emailaddress || attributes.nameID || attributes.nameId);
  if (!email) {
    throw new Error('SAML response has no email attribute');
  }
  return {
    email: String(email),
    firstName: String(first(attributes.firstName || attributes.givenname) || 'SSO'),
    lastName: String(first(attributes.lastName || attributes.surname) || 'User'),
    nameId: extract.nameID || null,
  };
}

export default { isSsoConfigured, buildServiceProvider, buildIdentityProvider, buildLoginRequest, handleAcs };
