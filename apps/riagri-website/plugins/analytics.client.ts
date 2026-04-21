/**
 * Analytics + Custom Code Injection Plugin
 * Injects Google Analytics and custom head/body scripts from website settings
 */
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  try {
    const res = await $fetch<{ success: boolean; data: Record<string, string> }>(
      `${apiBase}/settings`
    );
    const settings = res?.data || (res as any) || {};

    const gaId = settings['google_analytics_id'];
    const customHeadCode = settings['custom_head_code'];
    const customBodyCode = settings['custom_body_code'];

    // Inject Google Analytics
    if (gaId) {
      useHead({
        script: [
          {
            async: true,
            src: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
          },
          {
            innerHTML: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`,
          },
        ],
      });
    }

    // Inject custom head scripts
    if (customHeadCode) {
      useHead({
        script: [
          {
            innerHTML: customHeadCode,
          },
        ],
      });
    }

    // Inject custom body scripts (append to body on client)
    if (customBodyCode) {
      const el = document.createElement('div');
      el.innerHTML = customBodyCode;
      document.body.appendChild(el);
    }
  } catch (err) {
    // Silently fail — analytics is non-critical
  }
});
