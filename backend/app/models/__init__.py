"""Import all ORM models so SQLAlchemy mappers are fully configured."""

import app.models.academy  # noqa: F401
import app.models.canvas_save  # noqa: F401
import app.models.licensing  # noqa: F401
import app.models.stripe_event  # noqa: F401
import app.models.password_reset_token  # noqa: F401
import app.models.user  # noqa: F401
