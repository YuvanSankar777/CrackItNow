from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("interviews", "0003_interviewsession_company"),
    ]

    operations = [
        migrations.AddField(
            model_name="question",
            name="test_cases",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="question",
            name="starter_code",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
