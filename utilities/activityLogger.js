const safeString = (value, fallback) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
};

const truncate = (value, max = 80) => {
  if (!value || typeof value !== "string") return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
};

const summarizeInstance = (entity, action, instance, changedFields = []) => {
  if (entity === "user") {
    const label = safeString(instance.name, safeString(instance.email, "User"));
    const title = `User ${action}: ${label}`;
    const content =
      action === "update" && changedFields.length
        ? `Updated fields: ${changedFields.join(", ")}`
        : `${label} was ${action}d.`;
    return { title, content };
  }

  if (entity === "listing") {
    const label = safeString(instance.title, `Listing #${instance.id || "N/A"}`);
    const title = `Listing ${action}: ${label}`;
    const content =
      action === "update" && changedFields.length
        ? `Updated fields: ${changedFields.join(", ")}`
        : `${label} was ${action}d.`;
    return { title, content };
  }

  const rating = instance.rating ? `Rating ${instance.rating}/5` : "Review";
  const snippet = truncate(safeString(instance.content, safeString(instance.comment, "")), 100);
  const title = `${rating} ${action}`;
  const content =
    action === "update" && changedFields.length
      ? `Updated fields: ${changedFields.join(", ")}`
      : snippet || `Review was ${action}d.`;
  return { title, content };
};

const registerActivityHooks = (model, entity, AdminActivity) => {
  if (!model || !AdminActivity || model.activityHooksRegistered) return;

  const logActivity = async (action, instance, options = {}) => {
    try {
      const changedFields = Array.isArray(options.fields) ? options.fields : [];
      const { title, content } = summarizeInstance(entity, action, instance, changedFields);

      await AdminActivity.create({
        entity,
        action,
        entityId: instance.id || null,
        title,
        content,
        metadata: {
          changedFields,
          user_id: instance.user_id || null,
          listing_id: instance.listing_id || null,
        },
      });
    } catch (error) {
      console.error(`Failed to log ${entity} ${action} activity:`, error.message);
    }
  };

  model.addHook("afterCreate", async (instance, options) => {
    await logActivity("create", instance, options);
  });

  model.addHook("afterUpdate", async (instance, options) => {
    await logActivity("update", instance, options);
  });

  model.addHook("afterDestroy", async (instance, options) => {
    await logActivity("delete", instance, options);
  });

  model.activityHooksRegistered = true;
};

module.exports = {
  registerActivityHooks,
};