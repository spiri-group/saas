'use server';

import sgMail from '@sendgrid/mail';

type EmailData = string | { email: string; name?: string };

type SendEmailProps = {
    sendgrid_auth: string,
    to: EmailData | EmailData[],
    from: string,
    cc: EmailData | EmailData[],
    templateId: string,
    attachments?: {
        content: string,
        filename: string,
        type: string,
        disposition: string
    }[],
    dynamic_template_data: any
}

export default async function SendEmail(props: SendEmailProps) {
    sgMail.setApiKey(props.sendgrid_auth);
        
    const msg = {
        to: props.to,
        from: props.from,
        templateId: props.templateId,
        attachments: props.attachments,
        dynamic_template_data: props.dynamic_template_data
    } as sgMail.MailDataRequired

    if (props.cc && (Array.isArray(props.cc) ? props.cc.length > 0 : true)) {
        msg.cc = props.cc;
    }

    try {
        await sgMail.send(msg);
        return { success: true };
    } catch (error) {
        return { success: false, error };
    }
}