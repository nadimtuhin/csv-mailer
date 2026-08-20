// ponytail: full DOMPurify implementation; add when sanitize behaviour needs unit coverage
const DOMPurify = {
  sanitize: (html, _config) => {
    if (!html || typeof html !== 'string') return '';
    if (_config && _config.ALLOWED_TAGS && _config.ALLOWED_TAGS.length === 0) {
      // Strip all tags
      return html.replace(/<[^>]*>/g, '');
    }
    return html;
  },
};

module.exports = DOMPurify;
module.exports.default = DOMPurify;
