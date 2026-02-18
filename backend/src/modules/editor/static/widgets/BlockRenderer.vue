<script lang="ts">
import { defineComponent, computed, defineAsyncComponent, h, onMounted, onBeforeUnmount, ref, type Component } from 'vue';
import './widget-styles.css';
import './animation-styles.css';

// Render components — lazy-loaded
const renders: Record<string, Component> = {
  sectionBlock: defineAsyncComponent(() => import('./renders/SectionRender.vue')),
  columnsBlock: defineAsyncComponent(() => import('./renders/ColumnsRender.vue')),
  columnBlock: defineAsyncComponent(() => import('./renders/ColumnRender.vue')),
  imageBlock: defineAsyncComponent(() => import('./renders/ImageRender.vue')),
  videoBlock: defineAsyncComponent(() => import('./renders/VideoRender.vue')),
  buttonBlock: defineAsyncComponent(() => import('./renders/ButtonRender.vue')),
  spacerBlock: defineAsyncComponent(() => import('./renders/SpacerRender.vue')),
  calloutBlock: defineAsyncComponent(() => import('./renders/CalloutRender.vue')),
  htmlBlock: defineAsyncComponent(() => import('./renders/HtmlRender.vue')),
  advancedHeading: defineAsyncComponent(() => import('./renders/AdvancedHeadingRender.vue')),
  dualHeading: defineAsyncComponent(() => import('./renders/DualHeadingRender.vue')),
  infoBox: defineAsyncComponent(() => import('./renders/InfoBoxRender.vue')),
  imageGallery: defineAsyncComponent(() => import('./renders/ImageGalleryRender.vue')),
  faq: defineAsyncComponent(() => import('./renders/FaqRender.vue')),
  priceTable: defineAsyncComponent(() => import('./renders/PriceTableRender.vue')),
  priceList: defineAsyncComponent(() => import('./renders/PriceListRender.vue')),
  teamMember: defineAsyncComponent(() => import('./renders/TeamMemberRender.vue')),
  testimonial: defineAsyncComponent(() => import('./renders/TestimonialRender.vue')),
  countdown: defineAsyncComponent(() => import('./renders/CountdownRender.vue')),
  contentToggle: defineAsyncComponent(() => import('./renders/ContentToggleRender.vue')),
  marketingButton: defineAsyncComponent(() => import('./renders/MarketingButtonRender.vue')),
  modalPopup: defineAsyncComponent(() => import('./renders/ModalPopupRender.vue')),
  googleMap: defineAsyncComponent(() => import('./renders/GoogleMapRender.vue')),
  contactForm: defineAsyncComponent(() => import('./renders/ContactFormRender.vue')),
  businessHours: defineAsyncComponent(() => import('./renders/BusinessHoursRender.vue')),
  socialShare: defineAsyncComponent(() => import('./renders/SocialShareRender.vue')),
  postsGrid: defineAsyncComponent(() => import('./renders/PostsGridRender.vue')),
  iconList: defineAsyncComponent(() => import('./renders/IconListRender.vue')),
  progressBar: defineAsyncComponent(() => import('./renders/ProgressBarRender.vue')),

  // Phase 4 blocks
  carouselBlock: defineAsyncComponent(() => import('./renders/CarouselRender.vue')),
  flipBox: defineAsyncComponent(() => import('./renders/FlipBoxRender.vue')),
  animatedHeadline: defineAsyncComponent(() => import('./renders/AnimatedHeadlineRender.vue')),
  hotspotBlock: defineAsyncComponent(() => import('./renders/HotspotRender.vue')),
  tocBlock: defineAsyncComponent(() => import('./renders/TOCRender.vue')),
  offCanvasBlock: defineAsyncComponent(() => import('./renders/OffCanvasRender.vue')),

  // Inline nodes
  dynamicTag: defineAsyncComponent(() => import('./renders/DynamicTagRender.vue')),
};

const markTags: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  code: 'code',
};

const containerTypes = new Set(['sectionBlock', 'columnsBlock', 'columnBlock', 'calloutBlock']);

// Attributes that should be arrays — TipTap may serialize them as JSON strings
const arrayAttrs = new Set(['items', 'features', 'images', 'links', 'fields', 'hours', 'platforms', 'socials', 'contentA', 'contentB']);

/** Parse attrs: JSON strings → objects/arrays, rename conflicting keys */
function prepareAttrs(attrs: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(attrs)) {
    // Rename 'style' to 'displayStyle' to avoid HTML style attribute collision
    const key = k === 'style' ? 'displayStyle' : k;
    // Empty strings for known array attrs → empty array
    if (arrayAttrs.has(k) && (v === '' || v === null || v === undefined)) {
      result[key] = [];
      continue;
    }
    if (typeof v === 'string' && v && (arrayAttrs.has(k) || (v.startsWith('[') || v.startsWith('{')))) {
      try { result[key] = JSON.parse(v); continue; } catch { /* not JSON, keep as string */ }
    }
    result[key] = v;
  }
  return result;
}

function renderNode(node: any, key: number): any {
  if (!node || !node.type) return null;

  const attrs = node.attrs || {};
  const children = node.content || [];

  if (node.type === 'text') {
    let text: any = node.text || '';
    if (node.marks && node.marks.length) {
      for (const mark of node.marks) {
        const tag = markTags[mark.type];
        if (tag) {
          text = h(tag, null, text);
        } else if (mark.type === 'link') {
          text = h('a', { href: mark.attrs?.href || '#', target: mark.attrs?.target || '_blank', rel: 'noopener noreferrer' }, text);
        } else if (mark.type === 'textStyle') {
          text = h('span', { style: { color: mark.attrs?.color } }, text);
        } else if (mark.type === 'highlight') {
          text = h('mark', { style: { backgroundColor: mark.attrs?.color } }, text);
        }
      }
    }
    return text;
  }

  if (node.type === 'paragraph') {
    const style: any = {};
    if (attrs.textAlign) style.textAlign = attrs.textAlign;
    return h('p', { key, style }, children.map((c: any, i: number) => renderNode(c, i)));
  }

  if (node.type === 'heading') {
    const tag = `h${attrs.level || 2}`;
    const style: any = {};
    if (attrs.textAlign) style.textAlign = attrs.textAlign;
    return h(tag, { key, style }, children.map((c: any, i: number) => renderNode(c, i)));
  }

  if (node.type === 'bulletList') return h('ul', { key }, children.map((c: any, i: number) => renderNode(c, i)));
  if (node.type === 'orderedList') return h('ol', { key, start: attrs.start || 1 }, children.map((c: any, i: number) => renderNode(c, i)));
  if (node.type === 'listItem') return h('li', { key }, children.map((c: any, i: number) => renderNode(c, i)));
  if (node.type === 'blockquote') return h('blockquote', { key }, children.map((c: any, i: number) => renderNode(c, i)));

  if (node.type === 'codeBlock') {
    const code = children.map((c: any) => c.text || '').join('');
    return h('pre', { key }, [h('code', { class: attrs.language ? `language-${attrs.language}` : '' }, code)]);
  }

  if (node.type === 'horizontalRule') return h('hr', { key });
  if (node.type === 'hardBreak') return h('br', { key });

  if (node.type === 'image') return h('img', { key, src: attrs.src, alt: attrs.alt || '', title: attrs.title || '' });

  if (node.type === 'table') return h('table', { key }, children.map((c: any, i: number) => renderNode(c, i)));
  if (node.type === 'tableRow') return h('tr', { key }, children.map((c: any, i: number) => renderNode(c, i)));
  if (node.type === 'tableCell') return h('td', { key, colspan: attrs.colspan, rowspan: attrs.rowspan }, children.map((c: any, i: number) => renderNode(c, i)));
  if (node.type === 'tableHeader') return h('th', { key, colspan: attrs.colspan, rowspan: attrs.rowspan }, children.map((c: any, i: number) => renderNode(c, i)));

  const RenderComp = renders[node.type];
  if (RenderComp) {
    const prepared = prepareAttrs(attrs);

    // Extract common attributes for wrapper
    const { blockId, cssClass, customCss, entranceAnimation, animationDuration, animationDelay, ...renderProps } = prepared;

    let rendered: any;
    if (containerTypes.has(node.type) && children.length) {
      rendered = h(RenderComp, { key, ...renderProps }, {
        default: () => children.map((c: any, i: number) => renderNode(c, i)),
      });
    } else {
      rendered = h(RenderComp, { key, ...renderProps });
    }

    // Wrap with common attributes if any are set
    const hasCommon = blockId || cssClass || customCss || (entranceAnimation && entranceAnimation !== 'none');
    if (hasCommon) {
      const wrapperAttrs: Record<string, any> = {};
      if (blockId) wrapperAttrs.id = blockId;
      if (cssClass) wrapperAttrs.class = cssClass;
      if (entranceAnimation && entranceAnimation !== 'none') {
        wrapperAttrs['data-lume-animation'] = entranceAnimation;
        wrapperAttrs.style = {
          '--lume-anim-duration': `${animationDuration || 600}ms`,
          '--lume-anim-delay': `${animationDelay || 0}ms`,
        };
      }

      const wrapperChildren = [rendered];

      // Inject scoped custom CSS
      if (customCss && blockId) {
        wrapperChildren.push(h('style', null, `#${blockId} { ${customCss} }`));
      }

      return h('div', wrapperAttrs, wrapperChildren);
    }

    return rendered;
  }

  if (children.length) {
    return h('div', { key, 'data-type': node.type }, children.map((c: any, i: number) => renderNode(c, i)));
  }
  return null;
}

export default defineComponent({
  name: 'BlockRenderer',
  props: {
    content: { type: [Object, String, Array], default: null },
  },
  setup(props) {
    const doc = computed(() => {
      if (!props.content) return null;
      if (typeof props.content === 'string') {
        try { return JSON.parse(props.content); } catch { return null; }
      }
      return props.content;
    });

    const nodes = computed(() => {
      const d = doc.value;
      if (!d) return [];
      if (d.type === 'doc') return d.content || [];
      if (Array.isArray(d)) return d;
      return [d];
    });

    const containerRef = ref<HTMLElement | null>(null);
    let observer: IntersectionObserver | null = null;

    onMounted(() => {
      // Set up IntersectionObserver for entrance animations
      if (typeof IntersectionObserver === 'undefined') return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('lume-anim-visible');
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );

      // Observe all animated elements
      const el = containerRef.value;
      if (el) {
        el.querySelectorAll('[data-lume-animation]').forEach((animEl) => {
          observer!.observe(animEl);
        });
      }
    });

    onBeforeUnmount(() => {
      observer?.disconnect();
    });

    return { nodes, containerRef };
  },
  render() {
    if (!this.nodes || !this.nodes.length) return null;
    return h('div', { class: 'lume-page-content', ref: 'containerRef' }, this.nodes.map((n: any, i: number) => renderNode(n, i)));
  },
});
</script>

<style>
.lume-page-content {
  max-width: 100%;
  overflow-x: hidden;
}
.lume-page-content p { margin: 0.5em 0; }
.lume-page-content h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; }
.lume-page-content h2 { font-size: 1.5em; font-weight: 600; margin: 0.75em 0; }
.lume-page-content h3 { font-size: 1.25em; font-weight: 600; margin: 0.75em 0; }
.lume-page-content h4 { font-size: 1.1em; font-weight: 600; margin: 0.75em 0; }
.lume-page-content ul { list-style-type: disc; padding-left: 1.5em; margin: 0.5em 0; }
.lume-page-content ol { list-style-type: decimal; padding-left: 1.5em; margin: 0.5em 0; }
.lume-page-content blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; color: #6b7280; font-style: italic; margin: 0.5em 0; }
.lume-page-content pre { background: #1e1e2e; color: #cdd6f4; border-radius: 6px; padding: 12px 16px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px; overflow-x: auto; margin: 0.5em 0; }
.lume-page-content code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
.lume-page-content pre code { background: none; padding: 0; }
.lume-page-content img { max-width: 100%; height: auto; }
.lume-page-content a { color: #3b82f6; text-decoration: underline; }
.lume-page-content table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
.lume-page-content th, .lume-page-content td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
.lume-page-content th { background: #f9fafb; font-weight: 600; }
.lume-page-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1em 0; }
</style>
