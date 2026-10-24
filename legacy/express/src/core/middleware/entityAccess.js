/**
 * Entity Access Control Middleware
 *
 * Determines entity visibility based on route context:
 * - Public routes: Only published, non-deleted entities
 * - Admin routes: All non-deleted entities (published or draft)
 *
 * Adds getEntityFilter() function to request object for use in route handlers.
 *
 * Usage:
 *   app.use(entityAccessMiddleware);
 *   app.get('/api/entities', (req, res) => {
 *     const filter = req.getEntityFilter();
 *     // Returns { isPublished: true, deletedAt: null } for public routes
 *     // Returns { deletedAt: null } for admin routes
 *   });
 */

export const entityAccessMiddleware = (req, res, next) => {
  const isPublicRoute = req.path.startsWith('/api/public/');

  /**
   * Get entity filter based on route context.
   * Used for constructing WHERE clauses in database queries.
   *
   * @returns {Object} Filter object with isPublished and deletedAt conditions
   */
  req.getEntityFilter = function() {
    if (isPublicRoute) {
      // Public routes only see published, non-deleted entities
      return { isPublished: true, deletedAt: null };
    }
    // Admin routes see all non-deleted entities (including drafts)
    return { deletedAt: null };
  };

  next();
};

export default entityAccessMiddleware;
