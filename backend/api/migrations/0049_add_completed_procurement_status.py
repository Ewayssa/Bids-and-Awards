from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0048_document_pr_items'),
    ]

    operations = [
        migrations.AlterField(
            model_name='procurementrecord',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('preparing', 'Preparing Documents'),
                    ('under_review', 'Under Review'),
                    ('for_revision', 'For Revision'),
                    ('approved', 'Approved for Input'),
                    ('for_input', 'For Input'),
                    ('for_posting', 'For Posting'),
                    ('for_float', 'For Float'),
                    ('for_schedule', 'For Schedule'),
                    ('under_evaluation', 'Under Evaluation'),
                    ('for_award', 'For Award'),
                    ('awarded', 'Awarded'),
                    ('for_liquidation', 'For Liquidation'),
                    ('completed', 'Completed'),
                    ('closed', 'Closed'),
                ],
                default='draft',
                max_length=30,
            ),
        ),
    ]
